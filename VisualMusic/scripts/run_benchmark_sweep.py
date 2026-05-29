from __future__ import annotations

import json
import math
import statistics
import wave
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "benchmarks" / "benchmark_catalog.json"
OUTPUT_DIR = ROOT / "runtime" / "benchmark-sweeps"
PRESET_PATH = ROOT / "configs" / "listening.benchmark-sweep.recommended.json"
WINDOW_MS = 10
WINDOW_SAMPLES = 441
FRAME_SIZE = 1024
HOP_SIZE = WINDOW_SAMPLES


@dataclass(frozen=True)
class CandidateConfig:
    id: str
    plugin_mode: str
    onset_weight: float
    low_band_weight: float
    normalize_input: bool
    tonality_guard: bool
    transient_boost: float
    low_smoothing_ms: int
    threshold_bias: float
    onset_low_hz: int
    onset_high_hz: int
    low_band_low_hz: int
    low_band_high_hz: int
    onset_profile: str
    low_band_mix: float
    guard_strength: float


def load_catalog() -> dict:
    return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))


def load_wav_mono(path: Path) -> list[float]:
    with wave.open(str(path), "rb") as wav_file:
        frames = wav_file.readframes(wav_file.getnframes())
        sample_width = wav_file.getsampwidth()
        channels = wav_file.getnchannels()
        if sample_width != 2:
            raise ValueError(f"Unsupported sample width in {path}: {sample_width}")
        pcm = []
        frame_stride = sample_width * channels
        for index in range(0, len(frames), frame_stride):
            values = []
            for channel in range(channels):
                start = index + (channel * sample_width)
                sample = int.from_bytes(frames[start:start + 2], byteorder="little", signed=True)
                values.append(sample / 32768.0)
            pcm.append(sum(values) / len(values))
        return pcm


def rms_envelope(samples: list[float], window_samples: int = WINDOW_SAMPLES) -> list[float]:
    envelope = []
    for index in range(0, len(samples), window_samples):
        window = samples[index:index + window_samples]
        if not window:
            continue
        power = sum(sample * sample for sample in window) / len(window)
        envelope.append(math.sqrt(power))
    return envelope


def smooth(values: list[float], window_size: int) -> list[float]:
    if window_size <= 1:
        return values[:]
    smoothed = []
    radius = window_size // 2
    for index in range(len(values)):
        start = max(0, index - radius)
        end = min(len(values), index + radius + 1)
        window = values[start:end]
        smoothed.append(sum(window) / len(window))
    return smoothed


def normalize(values: list[float]) -> list[float]:
    if not values:
        return []
    peak = max(values)
    if peak <= 1e-6:
        return values[:]
    return [value / peak for value in values]


def frame_signal(samples: np.ndarray, frame_size: int = FRAME_SIZE, hop_size: int = HOP_SIZE) -> np.ndarray:
    if samples.size == 0:
        return np.zeros((0, frame_size), dtype=np.float32)
    frame_count = max(1, int(math.ceil(max(1, samples.size - frame_size) / hop_size)) + 1)
    padded_length = ((frame_count - 1) * hop_size) + frame_size
    padded = np.zeros(padded_length, dtype=np.float32)
    padded[:samples.size] = samples
    indices = np.arange(frame_size)[None, :] + (np.arange(frame_count)[:, None] * hop_size)
    return padded[indices]


def positive_diff(values: np.ndarray) -> np.ndarray:
    if values.size == 0:
        return values
    diff = np.diff(values, prepend=values[:1])
    return np.maximum(diff, 0.0)


def normalize_np(values: np.ndarray) -> np.ndarray:
    if values.size == 0:
        return values
    peak = float(np.max(values))
    if peak <= 1e-9:
        return values
    return values / peak


def moving_average_np(values: np.ndarray, window_size: int) -> np.ndarray:
    if values.size == 0 or window_size <= 1:
        return values.copy()
    window = np.ones(window_size, dtype=np.float32) / float(window_size)
    return np.convolve(values, window, mode="same")


def analyze_frequency_bands(samples: list[float], candidate: CandidateConfig) -> dict[str, list[float]]:
    audio = np.asarray(samples, dtype=np.float32)
    if audio.size == 0:
        return {"onset": [], "low_band": [], "combined": [], "baseline": []}

    if candidate.normalize_input:
        peak = float(np.max(np.abs(audio)))
        if peak > 1e-9:
            audio = audio / peak

    frames = frame_signal(audio)
    window = np.hanning(FRAME_SIZE).astype(np.float32)
    windowed = frames * window[None, :]
    spectrum = np.fft.rfft(windowed, axis=1)
    magnitude = np.abs(spectrum).astype(np.float32)
    log_magnitude = np.log1p(magnitude)
    freqs = np.fft.rfftfreq(FRAME_SIZE, d=1.0 / 44100.0)

    onset_mask = (freqs >= candidate.onset_low_hz) & (freqs <= candidate.onset_high_hz)
    low_mask = (freqs >= candidate.low_band_low_hz) & (freqs <= candidate.low_band_high_hz)
    if not np.any(onset_mask):
        onset_mask = freqs >= 700.0
    if not np.any(low_mask):
        low_mask = freqs <= 180.0

    onset_band = log_magnitude[:, onset_mask]
    low_band = log_magnitude[:, low_mask]

    onset_flux = positive_diff(np.mean(onset_band, axis=1))
    hfc_weights = np.linspace(1.0, 2.4, onset_band.shape[1], dtype=np.float32)
    onset_hfc = positive_diff(np.mean(onset_band * hfc_weights[None, :], axis=1))
    if candidate.onset_profile == "hfc":
        onset_component = onset_hfc
    elif candidate.onset_profile == "hybrid":
        onset_component = (onset_flux * 0.55) + (onset_hfc * 0.45)
    else:
        onset_component = onset_flux
    onset_component = normalize_np(onset_component * candidate.transient_boost)

    low_energy = np.mean(low_band, axis=1)
    low_flux = positive_diff(low_energy)
    low_energy = normalize_np(low_energy)
    low_flux = normalize_np(low_flux)
    smoothing_frames = max(3, int(candidate.low_smoothing_ms / WINDOW_MS))
    low_energy = moving_average_np(low_energy, smoothing_frames)
    low_component = (candidate.low_band_mix * low_flux) + ((1.0 - candidate.low_band_mix) * low_energy)
    low_component = normalize_np(low_component)

    baseline = normalize_np(np.asarray(rms_envelope(samples), dtype=np.float32))
    if baseline.size < onset_component.size:
        baseline = np.pad(baseline, (0, onset_component.size - baseline.size))
    else:
        baseline = baseline[:onset_component.size]

    if candidate.tonality_guard:
        spectral_flatness = np.exp(np.mean(np.log(magnitude + 1e-8), axis=1)) / (np.mean(magnitude + 1e-8, axis=1))
        spectral_flatness = normalize_np(spectral_flatness.astype(np.float32))
        guard = np.clip((spectral_flatness * (1.0 + candidate.guard_strength)) + 0.18, 0.15, 1.0)
        onset_component = onset_component * guard
        low_component = low_component * ((guard * 0.45) + (1.0 - candidate.guard_strength * 0.15))

    combined = (candidate.onset_weight * onset_component) + (candidate.low_band_weight * low_component)
    if candidate.plugin_mode == "onset_only":
        combined = onset_component
    elif candidate.plugin_mode == "low_only":
        combined = low_component
    combined = normalize_np(combined)

    return {
        "onset": onset_component.tolist(),
        "low_band": low_component.tolist(),
        "combined": combined.tolist(),
        "baseline": baseline.tolist(),
    }


def apply_candidate(envelope: list[float], candidate: CandidateConfig) -> list[float]:
    base = normalize(envelope) if candidate.normalize_input else envelope[:]
    if candidate.tonality_guard:
        tonal_bed = smooth(base, max(3, int(250 / WINDOW_MS)))
        guard_signal = [max(0.0, current - bed * 0.82) for current, bed in zip(base, tonal_bed)]
    else:
        guard_signal = base

    onset = [0.0]
    for previous, current in zip(guard_signal, guard_signal[1:]):
        onset.append(max(0.0, current - previous) * candidate.transient_boost)
    onset = normalize(onset)

    low_window = max(3, int(candidate.low_smoothing_ms / WINDOW_MS))
    low_band = smooth(base, low_window)
    low_band = normalize(low_band)

    combined = [
        (candidate.onset_weight * on) + (candidate.low_band_weight * low)
        for on, low in zip(onset, low_band)
    ]
    return normalize(combined)


def fuse_signals(band_analysis: dict[str, list[float]], envelope: list[float], candidate: CandidateConfig) -> list[float]:
    band_signal = band_analysis["combined"]
    fallback_signal = apply_candidate(envelope, candidate)
    if not band_signal:
        return fallback_signal
    if not fallback_signal:
        return band_signal

    limit = min(len(band_signal), len(fallback_signal))
    fused = [
        (band_signal[index] * 0.82) + (fallback_signal[index] * 0.18)
        for index in range(limit)
    ]
    return normalize(fused)


def detect_peaks(signal: list[float], candidate: CandidateConfig) -> list[float]:
    if not signal:
        return []
    baseline = statistics.fmean(signal)
    threshold = max(0.14, min(0.9, baseline + candidate.threshold_bias))
    peaks = []
    min_gap = max(2, int(160 / WINDOW_MS))
    last_peak = -min_gap
    for index in range(1, len(signal) - 1):
        current = signal[index]
        if current < threshold:
            continue
        if current < signal[index - 1] or current < signal[index + 1]:
            continue
        if index - last_peak < min_gap:
            if peaks and current > signal[int(peaks[-1] * 1000 / WINDOW_MS)]:
                peaks[-1] = index * WINDOW_MS / 1000.0
                last_peak = index
            continue
        peaks.append(index * WINDOW_MS / 1000.0)
        last_peak = index
    return peaks


def nearest_peak_distance(time_sec: float, peaks: list[float], tolerance_sec: float) -> float | None:
    nearest = min((abs(peak - time_sec) for peak in peaks), default=None)
    if nearest is None or nearest > tolerance_sec:
        return None
    return nearest


def estimate_bpm_for_segment(segment: dict, peaks: list[float]) -> tuple[float | None, float]:
    start = segment["start_sec"]
    bpm = segment["bpm"]
    beat_period = 60.0 / bpm
    end = start + segment["bars"] * 4 * beat_period
    segment_peaks = [peak for peak in peaks if start <= peak <= end]
    if len(segment_peaks) < 3:
        return None, 0.0
    intervals = [right - left for left, right in zip(segment_peaks, segment_peaks[1:]) if right - left > 0.15]
    if not intervals:
        return None, 0.0
    median_interval = statistics.median(intervals)
    estimated_bpm = 60.0 / median_interval
    stability = 1.0 / (1.0 + statistics.pstdev(intervals))
    return estimated_bpm, min(1.0, stability)


def compute_relock_score(song: dict, peaks: list[float]) -> float:
    tempo_changes = song["tempo_changes"][1:]
    if not tempo_changes:
        return 1.0
    scores = []
    sections = {section["label"]: section for section in song["sections"]}
    for change in tempo_changes:
        section = sections.get(change["label"])
        if not section:
            continue
        beat_period = 60.0 / change["bpm"]
        expected_beats = [change["start_sec"] + beat_period * step for step in range(3)]
        misses = 0
        for beat_time in expected_beats:
            if nearest_peak_distance(beat_time, peaks, 0.09) is None:
                misses += 1
        scores.append(max(0.0, 1.0 - (misses / len(expected_beats))))
    return statistics.fmean(scores) if scores else 1.0


def compute_pause_score(song: dict, peaks: list[float]) -> float:
    pauses = song["pause_windows"]
    if not pauses:
        return 1.0
    false_hits = 0
    total_window_sec = 0.0
    for pause in pauses:
        start = pause["start_sec"] + 0.05
        end = pause["start_sec"] + pause["duration_sec"] - 0.05
        if end <= start:
            continue
        total_window_sec += end - start
        false_hits += sum(1 for peak in peaks if start <= peak <= end)
    density = false_hits / max(0.25, total_window_sec)
    return max(0.0, 1.0 - min(1.0, density / 3.0))


def compute_downbeat_score(song: dict, signal: list[float]) -> float:
    downbeats = song["known_downbeats"]
    if not downbeats:
        return 0.0
    strengths = []
    off_strengths = []
    for marker in downbeats:
        index = min(len(signal) - 1, int(marker["time_sec"] * 1000 / WINDOW_MS))
        strengths.append(signal[index])
        off_index = min(len(signal) - 1, index + int((60.0 / marker["bpm"]) * 1000 / WINDOW_MS))
        off_strengths.append(signal[off_index])
    mean_down = statistics.fmean(strengths)
    mean_off = statistics.fmean(off_strengths) if off_strengths else 0.0
    ratio = mean_down / max(0.001, mean_off)
    return max(0.0, min(1.0, (ratio - 0.7) / 0.9))


def compute_grid_alignment_score(song: dict, peaks: list[float]) -> float:
    markers = song["beat_markers"]
    if not markers:
        return 0.0
    tolerances = []
    for marker in markers:
        tolerance = 0.06 if marker["beat_in_bar"] == 1 else 0.08
        distance = nearest_peak_distance(marker["time_sec"], peaks, tolerance)
        if distance is None:
            tolerances.append(1.0)
        else:
            tolerances.append(distance / tolerance)
    mean_error = statistics.fmean(tolerances)
    return max(0.0, 1.0 - min(1.0, mean_error))


def evaluate_song(song: dict, candidate: CandidateConfig) -> dict:
    audio_path = ROOT / "benchmarks" / song["audio_file"]
    samples = load_wav_mono(audio_path)
    envelope = rms_envelope(samples)
    band_analysis = analyze_frequency_bands(samples, candidate)
    signal = fuse_signals(band_analysis, envelope, candidate)
    peaks = detect_peaks(signal, candidate)

    segment_scores = []
    bpm_errors = []
    for section in song["sections"]:
        if section["bpm"] <= 0:
            continue
        estimated_bpm, stability = estimate_bpm_for_segment(section, peaks)
        if estimated_bpm is None:
            bpm_errors.append(100.0)
            segment_scores.append(0.0)
            continue
        error = abs(estimated_bpm - section["bpm"])
        bpm_errors.append(error)
        section_score = max(0.0, 1.0 - min(1.0, error / 12.0)) * (0.55 + stability * 0.45)
        segment_scores.append(section_score)

    bpm_score = statistics.fmean(segment_scores) if segment_scores else 0.0
    relock_score = compute_relock_score(song, peaks)
    pause_score = compute_pause_score(song, peaks)
    downbeat_score = compute_downbeat_score(song, signal)
    grid_score = compute_grid_alignment_score(song, peaks)
    overall = (
        bpm_score * 0.34
        + relock_score * 0.22
        + pause_score * 0.14
        + downbeat_score * 0.14
        + grid_score * 0.16
    )

    return {
        "song_id": song["id"],
        "bpm_score": round(bpm_score, 4),
        "relock_score": round(relock_score, 4),
        "pause_score": round(pause_score, 4),
        "downbeat_score": round(downbeat_score, 4),
        "grid_score": round(grid_score, 4),
        "mean_bpm_abs_error": round(statistics.fmean(bpm_errors), 3) if bpm_errors else 0.0,
        "peak_count": len(peaks),
        "overall_score": round(overall, 4),
    }


def candidate_library() -> list[CandidateConfig]:
    return [
        CandidateConfig("onset_flux_mid_hi_norm", "onset_only", 1.0, 0.0, True, False, 1.7, 180, 0.16, 700, 6500, 45, 180, "flux", 0.7, 0.0),
        CandidateConfig("onset_hfc_bright_norm", "onset_only", 1.0, 0.0, True, False, 1.85, 180, 0.15, 1200, 10000, 45, 180, "hfc", 0.7, 0.0),
        CandidateConfig("onset_hybrid_guard", "onset_only", 1.0, 0.0, True, True, 1.85, 180, 0.14, 700, 8000, 45, 180, "hybrid", 0.7, 0.45),
        CandidateConfig("low_kick_core_norm", "low_only", 0.0, 1.0, True, False, 1.0, 240, 0.14, 700, 6500, 45, 140, "flux", 0.76, 0.0),
        CandidateConfig("low_kick_punch_guard", "low_only", 0.0, 1.0, True, True, 1.0, 260, 0.13, 700, 6500, 60, 220, "flux", 0.7, 0.5),
        CandidateConfig("blend_flux_kick_core", "dual_weighted", 0.68, 0.32, True, False, 1.8, 220, 0.15, 700, 6500, 45, 140, "flux", 0.76, 0.0),
        CandidateConfig("blend_flux_kick_guard", "dual_weighted", 0.64, 0.36, True, True, 1.85, 220, 0.14, 700, 6500, 45, 180, "flux", 0.72, 0.45),
        CandidateConfig("blend_hybrid_punch_guard", "dual_weighted", 0.62, 0.38, True, True, 1.9, 240, 0.14, 700, 8000, 60, 220, "hybrid", 0.68, 0.5),
        CandidateConfig("blend_hfc_kick_fast", "dual_weighted", 0.7, 0.3, True, False, 1.95, 200, 0.15, 1200, 10000, 45, 180, "hfc", 0.74, 0.0),
        CandidateConfig("blend_balanced_melflux", "dual_weighted", 0.58, 0.42, True, False, 1.75, 240, 0.15, 500, 7000, 45, 180, "flux", 0.7, 0.0),
        CandidateConfig("blend_balanced_guarded", "dual_weighted", 0.56, 0.44, True, True, 1.8, 260, 0.14, 500, 7000, 45, 180, "hybrid", 0.68, 0.45),
        CandidateConfig("blend_low_bias_safe", "dual_weighted", 0.42, 0.58, True, True, 1.6, 280, 0.13, 700, 6500, 45, 140, "flux", 0.78, 0.55),
    ]


def evaluate_candidates(catalog: dict, candidates: list[CandidateConfig]) -> list[dict]:
    results = []
    for candidate in candidates:
        per_song = [evaluate_song(song, candidate) for song in catalog["songs"]]
        overall_score = statistics.fmean(item["overall_score"] for item in per_song)
        results.append(
            {
                "candidate": asdict(candidate),
                "overall_score": round(overall_score, 4),
                "mean_grid_score": round(statistics.fmean(item["grid_score"] for item in per_song), 4),
                "mean_bpm_error": round(statistics.fmean(item["mean_bpm_abs_error"] for item in per_song), 3),
                "mean_pause_score": round(statistics.fmean(item["pause_score"] for item in per_song), 4),
                "songs": per_song,
            }
        )
    return sorted(results, key=lambda item: (-item["overall_score"], item["mean_bpm_error"]))


def refine_candidate_library(seed: CandidateConfig) -> list[CandidateConfig]:
    refinements = [
        {"onset_weight": 0.68, "onset_low_hz": 1000, "onset_high_hz": 10000, "low_band_high_hz": 180, "threshold_bias": 0.15, "low_band_mix": 0.74, "transient_boost": 1.9},
        {"onset_weight": 0.72, "onset_low_hz": 1000, "onset_high_hz": 10000, "low_band_high_hz": 180, "threshold_bias": 0.15, "low_band_mix": 0.74, "transient_boost": 1.98},
        {"onset_weight": 0.7, "onset_low_hz": 1200, "onset_high_hz": 9000, "low_band_high_hz": 180, "threshold_bias": 0.14, "low_band_mix": 0.74, "transient_boost": 1.95},
        {"onset_weight": 0.7, "onset_low_hz": 1200, "onset_high_hz": 11000, "low_band_high_hz": 180, "threshold_bias": 0.16, "low_band_mix": 0.74, "transient_boost": 1.95},
        {"onset_weight": 0.7, "onset_low_hz": 1200, "onset_high_hz": 10000, "low_band_high_hz": 160, "threshold_bias": 0.15, "low_band_mix": 0.7, "transient_boost": 1.95},
        {"onset_weight": 0.7, "onset_low_hz": 1200, "onset_high_hz": 10000, "low_band_high_hz": 220, "threshold_bias": 0.15, "low_band_mix": 0.8, "transient_boost": 1.95},
        {"onset_weight": 0.66, "onset_low_hz": 1200, "onset_high_hz": 10000, "low_band_high_hz": 180, "threshold_bias": 0.15, "low_band_mix": 0.78, "transient_boost": 1.88},
        {"onset_weight": 0.74, "onset_low_hz": 1200, "onset_high_hz": 10000, "low_band_high_hz": 180, "threshold_bias": 0.15, "low_band_mix": 0.7, "transient_boost": 2.0},
        {"onset_weight": 0.68, "onset_low_hz": 900, "onset_high_hz": 9000, "low_band_high_hz": 200, "threshold_bias": 0.14, "low_band_mix": 0.72, "transient_boost": 1.9},
        {"onset_weight": 0.72, "onset_low_hz": 1400, "onset_high_hz": 11000, "low_band_high_hz": 160, "threshold_bias": 0.16, "low_band_mix": 0.72, "transient_boost": 2.0},
    ]
    candidates = []
    for index, refinement in enumerate(refinements, start=1):
        onset_weight = refinement["onset_weight"]
        candidates.append(
            CandidateConfig(
                id=f"{seed.id}_refine_{index:02d}",
                plugin_mode="dual_weighted",
                onset_weight=onset_weight,
                low_band_weight=round(1.0 - onset_weight, 2),
                normalize_input=True,
                tonality_guard=seed.tonality_guard,
                transient_boost=refinement["transient_boost"],
                low_smoothing_ms=seed.low_smoothing_ms,
                threshold_bias=refinement["threshold_bias"],
                onset_low_hz=refinement["onset_low_hz"],
                onset_high_hz=refinement["onset_high_hz"],
                low_band_low_hz=seed.low_band_low_hz,
                low_band_high_hz=refinement["low_band_high_hz"],
                onset_profile=seed.onset_profile,
                low_band_mix=refinement["low_band_mix"],
                guard_strength=seed.guard_strength,
            )
        )
    return candidates


def rank_candidates(catalog: dict) -> dict:
    coarse_ranked = evaluate_candidates(catalog, candidate_library())
    coarse_best = coarse_ranked[0]
    refined_seed = CandidateConfig(**coarse_best["candidate"])
    refined_ranked = evaluate_candidates(catalog, [refined_seed] + refine_candidate_library(refined_seed))
    ranked = refined_ranked if refined_ranked[0]["overall_score"] >= coarse_best["overall_score"] else coarse_ranked
    final_best = ranked[0]
    best_per_song = {}
    for song in catalog["songs"]:
        song_results = sorted(
            ranked,
            key=lambda candidate: next(entry["overall_score"] for entry in candidate["songs"] if entry["song_id"] == song["id"]),
            reverse=True,
        )
        winner = song_results[0]
        best_per_song[song["id"]] = {
            "candidate_id": winner["candidate"]["id"],
            "score": next(entry["overall_score"] for entry in winner["songs"] if entry["song_id"] == song["id"]),
        }

    return {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "analysis_version": "band-aware-v3",
        "coarse_recommended_candidate": coarse_best,
        "refined_recommended_candidate": refined_ranked[0],
        "ranked_candidates": ranked,
        "recommended_candidate": final_best,
        "best_per_song": best_per_song,
        "selection_rationale": [
            "Mid/high-band spectral flux is favored for crisp onset detection.",
            "Low-band beat emphasis is used to reinforce kick-driven tempo tracking.",
            "Guarded variants reduce false positives when stable tonal energy masks rhythm changes.",
            "A second local sweep is run around the first winner so the preset is refined instead of chosen from a single coarse grid.",
        ],
    }


def write_recommended_preset(payload: dict) -> None:
    recommended = payload["recommended_candidate"]
    candidate = recommended["candidate"]
    preset = {
        "preset_id": candidate["id"],
        "purpose": "Internet-informed second-pass sweep winner for listening-only BPM tracking and one-bar grid reconstruction.",
        "plugin_mode": candidate["plugin_mode"],
        "onset_weight": candidate["onset_weight"],
        "low_band_weight": candidate["low_band_weight"],
        "normalize_input": candidate["normalize_input"],
        "tonality_guard": candidate["tonality_guard"],
        "transient_boost": candidate["transient_boost"],
        "low_smoothing_ms": candidate["low_smoothing_ms"],
        "threshold_bias": candidate["threshold_bias"],
        "onset_band_hz": [candidate["onset_low_hz"], candidate["onset_high_hz"]],
        "low_band_hz": [candidate["low_band_low_hz"], candidate["low_band_high_hz"]],
        "onset_profile": candidate["onset_profile"],
        "low_band_mix": candidate["low_band_mix"],
        "guard_strength": candidate["guard_strength"],
        "analysis_version": payload["analysis_version"],
        "sweep_summary": {
            "overall_score": recommended["overall_score"],
            "mean_grid_score": recommended["mean_grid_score"],
            "mean_bpm_abs_error": recommended["mean_bpm_error"],
            "mean_pause_score": recommended["mean_pause_score"],
        },
        "notes": [
            "Second sweep uses explicit frequency-band analysis instead of only full-envelope analysis.",
            "Onset plugin is treated as the transient detector; low-band plugin is treated as the kick and pulse stabilizer.",
            "Recommended current focus: improve listening synchrony before any playback-side evolution.",
        ],
    }
    PRESET_PATH.write_text(json.dumps(preset, indent=2) + "\n", encoding="utf-8")


def write_report(payload: dict) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    json_path = OUTPUT_DIR / f"{timestamp}.benchmark-sweep.json"
    md_path = OUTPUT_DIR / f"{timestamp}.benchmark-sweep.md"
    latest_json = OUTPUT_DIR / "latest.benchmark-sweep.json"
    latest_md = OUTPUT_DIR / "latest.benchmark-sweep.md"

    json_text = json.dumps(payload, indent=2)
    json_path.write_text(json_text, encoding="utf-8")
    latest_json.write_text(json_text, encoding="utf-8")

    top = payload["ranked_candidates"][:6]
    recommended = payload["recommended_candidate"]["candidate"]
    lines = [
        "# Benchmark Sweep",
        "",
        f"Generated: `{payload['generated_at']}`",
        f"Analysis version: `{payload['analysis_version']}`",
        "",
        "## Recommended candidate",
        "",
        f"- id: `{recommended['id']}`",
        f"- mode: `{recommended['plugin_mode']}`",
        f"- onset / low-band weights: `{recommended['onset_weight']:.2f} / {recommended['low_band_weight']:.2f}`",
        f"- onset band: `{recommended['onset_low_hz']}-{recommended['onset_high_hz']} Hz`",
        f"- low band: `{recommended['low_band_low_hz']}-{recommended['low_band_high_hz']} Hz`",
        f"- onset profile: `{recommended['onset_profile']}`",
        f"- normalize: `{recommended['normalize_input']}`",
        f"- tonality guard: `{recommended['tonality_guard']}`",
        f"- overall score: `{payload['recommended_candidate']['overall_score']:.3f}`",
        f"- mean grid score: `{payload['recommended_candidate']['mean_grid_score']:.3f}`",
        f"- mean BPM abs error: `{payload['recommended_candidate']['mean_bpm_error']:.3f}`",
        "",
        "## Top candidates",
        "",
        "| candidate | mode | onset band | low band | profile | weights | guard | overall | bpm err | grid |",
        "|---|---|---|---|---|---|---|---:|---:|---:|",
    ]
    for item in top:
        candidate = item["candidate"]
        lines.append(
            f"| `{candidate['id']}` | `{candidate['plugin_mode']}` | `{candidate['onset_low_hz']}-{candidate['onset_high_hz']}` | `{candidate['low_band_low_hz']}-{candidate['low_band_high_hz']}` | `{candidate['onset_profile']}` | `{candidate['onset_weight']:.2f}/{candidate['low_band_weight']:.2f}` | `{candidate['tonality_guard']}` | {item['overall_score']:.3f} | {item['mean_bpm_error']:.3f} | {item['mean_grid_score']:.3f} |"
        )

    lines.extend(["", "## Best per song", ""])
    for song_id, entry in payload["best_per_song"].items():
        lines.append(f"- `{song_id}` -> `{entry['candidate_id']}` score `{entry['score']:.3f}`")

    md_text = "\n".join(lines) + "\n"
    md_path.write_text(md_text, encoding="utf-8")
    latest_md.write_text(md_text, encoding="utf-8")


def main() -> None:
    payload = rank_candidates(load_catalog())
    write_report(payload)
    write_recommended_preset(payload)
    print(json.dumps(payload["recommended_candidate"], indent=2))


if __name__ == "__main__":
    main()
