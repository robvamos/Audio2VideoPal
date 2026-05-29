from __future__ import annotations

import json
import math
import statistics
import wave
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "benchmarks" / "benchmark_catalog.json"
OUTPUT_DIR = ROOT / "runtime" / "benchmark-sweeps"
WINDOW_MS = 10
WINDOW_SAMPLES = 441


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
        for index in range(0, len(frames), sample_width * channels):
            value = int.from_bytes(frames[index:index + 2], byteorder="little", signed=True)
            pcm.append(value / 32768.0)
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


def detect_peaks(signal: list[float], candidate: CandidateConfig) -> list[float]:
    if not signal:
        return []
    baseline = statistics.fmean(signal)
    threshold = max(0.14, min(0.88, baseline + candidate.threshold_bias))
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
    signal = apply_candidate(envelope, candidate)
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
        CandidateConfig("onset_only_raw", "onset_only", 1.0, 0.0, False, False, 1.4, 160, 0.21),
        CandidateConfig("onset_only_norm", "onset_only", 1.0, 0.0, True, False, 1.8, 160, 0.18),
        CandidateConfig("low_only_norm", "low_only", 0.0, 1.0, True, False, 1.0, 260, 0.15),
        CandidateConfig("low_only_guard", "low_only", 0.0, 1.0, True, True, 1.0, 300, 0.14),
        CandidateConfig("blend_even_norm", "dual_weighted", 0.5, 0.5, True, False, 1.5, 220, 0.17),
        CandidateConfig("blend_even_guard", "dual_weighted", 0.5, 0.5, True, True, 1.6, 220, 0.16),
        CandidateConfig("blend_onset_65", "dual_weighted", 0.65, 0.35, True, False, 1.8, 200, 0.16),
        CandidateConfig("blend_onset_65_guard", "dual_weighted", 0.65, 0.35, True, True, 1.9, 200, 0.15),
        CandidateConfig("blend_low_65", "dual_weighted", 0.35, 0.65, True, False, 1.4, 260, 0.15),
        CandidateConfig("blend_low_65_guard", "dual_weighted", 0.35, 0.65, True, True, 1.5, 280, 0.14),
        CandidateConfig("blend_balanced_wide", "dual_weighted", 0.58, 0.42, True, True, 1.7, 300, 0.15),
        CandidateConfig("blend_balanced_tight", "dual_weighted", 0.58, 0.42, True, False, 1.7, 180, 0.17),
    ]


def rank_candidates(catalog: dict) -> dict:
    results = []
    for candidate in candidate_library():
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

    ranked = sorted(results, key=lambda item: (-item["overall_score"], item["mean_bpm_error"]))
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
        "ranked_candidates": ranked,
        "recommended_candidate": ranked[0],
        "best_per_song": best_per_song,
    }


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
    lines = [
        "# Benchmark Sweep",
        "",
        f"Generated: `{payload['generated_at']}`",
        "",
        "## Recommended candidate",
        "",
        f"- id: `{payload['recommended_candidate']['candidate']['id']}`",
        f"- mode: `{payload['recommended_candidate']['candidate']['plugin_mode']}`",
        f"- onset / low-band: `{payload['recommended_candidate']['candidate']['onset_weight']:.2f} / {payload['recommended_candidate']['candidate']['low_band_weight']:.2f}`",
        f"- normalize: `{payload['recommended_candidate']['candidate']['normalize_input']}`",
        f"- tonality guard: `{payload['recommended_candidate']['candidate']['tonality_guard']}`",
        f"- overall score: `{payload['recommended_candidate']['overall_score']:.3f}`",
        f"- mean grid score: `{payload['recommended_candidate']['mean_grid_score']:.3f}`",
        f"- mean BPM abs error: `{payload['recommended_candidate']['mean_bpm_error']:.3f}`",
        "",
        "## Top candidates",
        "",
        "| candidate | mode | onset | low | normalize | tonal guard | overall | bpm err | grid | pause |",
        "|---|---|---:|---:|---|---|---:|---:|---:|---:|",
    ]
    for item in top:
        candidate = item["candidate"]
        lines.append(
            f"| `{candidate['id']}` | `{candidate['plugin_mode']}` | {candidate['onset_weight']:.2f} | {candidate['low_band_weight']:.2f} | `{candidate['normalize_input']}` | `{candidate['tonality_guard']}` | {item['overall_score']:.3f} | {item['mean_bpm_error']:.3f} | {item['mean_grid_score']:.3f} | {item['mean_pause_score']:.3f} |"
        )

    lines.extend(
        [
            "",
            "## Best per song",
            "",
        ]
    )
    for song_id, entry in payload["best_per_song"].items():
        lines.append(f"- `{song_id}` -> `{entry['candidate_id']}` score `{entry['score']:.3f}`")

    md_text = "\n".join(lines) + "\n"
    md_path.write_text(md_text, encoding="utf-8")
    latest_md.write_text(md_text, encoding="utf-8")


def main() -> None:
    payload = rank_candidates(load_catalog())
    write_report(payload)
    print(json.dumps(payload["recommended_candidate"], indent=2))


if __name__ == "__main__":
    main()
