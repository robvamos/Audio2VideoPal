from __future__ import annotations

import json
import math
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import Any


SAMPLE_RATE = 44_100
MASTER_GAIN = 0.58
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "benchmarks"
AUDIO_DIR = OUTPUT_DIR / "audio"
METADATA_DIR = OUTPUT_DIR / "metadata"


@dataclass
class SegmentSpec:
    label: str
    bpm: float
    bars: int
    beat_emphasis: float = 1.0
    click_variant: str = "tight"
    is_pause: bool = False
    pause_seconds: float = 0.0


def clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def click_sample(index: int, duration_samples: int, strong: bool, variant: str) -> float:
    phase = index / SAMPLE_RATE
    env = math.exp(-phase * (30 if variant == "tight" else 18))
    base_freq = 1_540 if strong else 980
    tone = math.sin(2 * math.pi * base_freq * phase)
    overtone = math.sin(2 * math.pi * (base_freq * 1.7) * phase) * (0.22 if strong else 0.15)
    low = math.sin(2 * math.pi * (122 if strong else 91) * phase) * (0.18 if strong else 0.10)
    brightness = 1.0 if variant == "tight" else 0.78
    return (tone + overtone + low) * env * brightness


def render_song(song: dict[str, Any]) -> dict[str, Any]:
    sample_count = int(song["duration_seconds"] * SAMPLE_RATE)
    pcm = [0.0] * sample_count
    beat_markers: list[dict[str, Any]] = []
    section_markers: list[dict[str, Any]] = []
    cursor = 0.0
    absolute_bar = 0

    for section in song["sections"]:
        bpm = section["bpm"]
        beat_period = 60.0 / bpm
        meter = 4
        section_markers.append(
            {
                "label": section["label"],
                "start_sec": round(cursor, 6),
                "bpm": bpm,
                "bars": section["bars"],
                "pause_after_sec": round(section.get("pause_seconds", 0.0), 6),
            }
        )

        for bar_index in range(section["bars"]):
            absolute_bar += 1
            for beat in range(meter):
                beat_time = cursor + ((bar_index * meter + beat) * beat_period)
                beat_markers.append(
                    {
                        "time_sec": round(beat_time, 6),
                        "bar_index": absolute_bar,
                        "beat_in_bar": beat + 1,
                        "bpm": bpm,
                        "section": section["label"],
                        "is_downbeat": beat == 0,
                    }
                )
                click_duration_samples = int((0.07 if section["click_variant"] == "tight" else 0.095) * SAMPLE_RATE)
                click_start = int(beat_time * SAMPLE_RATE)
                for offset in range(click_duration_samples):
                    position = click_start + offset
                    if position >= sample_count:
                        break
                    strong = beat == 0
                    pulse = click_sample(offset, click_duration_samples, strong, section["click_variant"])
                    emphasis = section.get("beat_emphasis", 1.0) * (1.0 if strong else 0.74)
                    pcm[position] += pulse * emphasis

            swing_mod = 0.03 * math.sin((absolute_bar / max(1, song["total_bars"])) * math.pi * 6)
            start_index = int(cursor * SAMPLE_RATE)
            end_index = min(sample_count, int((cursor + (meter * beat_period)) * SAMPLE_RATE))
            for position in range(start_index, end_index):
                t = position / SAMPLE_RATE
                bed = (
                    math.sin(2 * math.pi * 48 * t)
                    + math.sin(2 * math.pi * 96 * t) * 0.35
                    + math.sin(2 * math.pi * 192 * t) * 0.12
                )
                pcm[position] += bed * 0.028 * (1.0 + swing_mod)

        cursor += section["bars"] * meter * beat_period
        if section.get("pause_seconds", 0.0) > 0:
            pause_start = cursor
            cursor += section["pause_seconds"]
            section_markers.append(
                {
                    "label": f"{section['label']}_pause",
                    "start_sec": round(pause_start, 6),
                    "bpm": 0,
                    "bars": 0,
                    "pause_after_sec": 0.0,
                }
            )

    peak = max(max(pcm), abs(min(pcm)), 0.001)
    normalized = [clamp(sample / peak * MASTER_GAIN, -0.99, 0.99) for sample in pcm]
    frames = bytearray()
    for sample in normalized:
        frames.extend(int(sample * 32767).to_bytes(2, byteorder="little", signed=True))

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    METADATA_DIR.mkdir(parents=True, exist_ok=True)
    wav_path = AUDIO_DIR / f"{song['id']}.wav"
    with wave.open(str(wav_path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        wav_file.writeframes(bytes(frames))

    metadata = {
        "id": song["id"],
        "title": song["title"],
        "purpose": song["purpose"],
        "meter": "4/4",
        "total_bars": song["total_bars"],
        "duration_seconds": round(song["duration_seconds"], 6),
        "expected_primary_bpm": song["expected_primary_bpm"],
        "tempo_changes": song["tempo_changes"],
        "pause_windows": song["pause_windows"],
        "known_downbeats": [marker for marker in beat_markers if marker["is_downbeat"]],
        "beat_markers": beat_markers,
        "sections": section_markers,
        "audio_file": str(wav_path.relative_to(OUTPUT_DIR)).replace("\\", "/"),
    }
    metadata_path = METADATA_DIR / f"{song['id']}.json"
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return metadata


def build_song_definition(
    song_id: str,
    title: str,
    purpose: str,
    expected_primary_bpm: float,
    section_specs: list[SegmentSpec],
) -> dict[str, Any]:
    sections = []
    total_bars = 0
    tempo_changes = []
    pause_windows = []
    cursor = 0.0
    last_bpm = None

    for spec in section_specs:
        if spec.is_pause:
            pause_windows.append(
                {
                    "label": spec.label,
                    "start_sec": round(cursor, 6),
                    "duration_sec": round(spec.pause_seconds, 6),
                }
            )
            cursor += spec.pause_seconds
            continue

        beat_period = 60.0 / spec.bpm
        duration_sec = spec.bars * 4 * beat_period
        section_entry = {
            "label": spec.label,
            "bpm": spec.bpm,
            "bars": spec.bars,
            "beat_emphasis": spec.beat_emphasis,
            "click_variant": spec.click_variant,
            "pause_seconds": spec.pause_seconds,
        }
        sections.append(section_entry)
        total_bars += spec.bars
        if last_bpm is None or abs(last_bpm - spec.bpm) > 0.01:
            tempo_changes.append(
                {
                    "label": spec.label,
                    "start_sec": round(cursor, 6),
                    "bpm": spec.bpm,
                }
            )
        cursor += duration_sec
        if spec.pause_seconds > 0:
            pause_windows.append(
                {
                    "label": f"{spec.label}_pause",
                    "start_sec": round(cursor, 6),
                    "duration_sec": round(spec.pause_seconds, 6),
                }
            )
            cursor += spec.pause_seconds
        last_bpm = spec.bpm

    return {
        "id": song_id,
        "title": title,
        "purpose": purpose,
        "expected_primary_bpm": expected_primary_bpm,
        "sections": sections,
        "total_bars": total_bars,
        "tempo_changes": tempo_changes,
        "pause_windows": pause_windows,
        "duration_seconds": cursor,
    }


def main() -> None:
    songs = [
        build_song_definition(
            "phase_alignment_drill",
            "Phase Alignment Drill",
            "Stable beat-1 recognition with tiny pauses and two tempo pivots.",
            96.0,
            [
                SegmentSpec("phase_intro", 96.0, 8, 1.16, "tight", pause_seconds=0.20),
                SegmentSpec("phase_mid_push", 100.0, 4, 1.12, "tight", pause_seconds=0.18),
                SegmentSpec("phase_return", 96.0, 8, 1.18, "tight", pause_seconds=0.24),
                SegmentSpec("phase_release", 92.0, 4, 1.10, "wide"),
            ],
        ),
        build_song_definition(
            "grid16_phrase_map",
            "Grid 16 Phrase Map",
            "Longer phrase map with two zones and a closing slowdown.",
            108.0,
            [
                SegmentSpec("grid_phrase_a", 108.0, 8, 1.05, "wide", pause_seconds=0.28),
                SegmentSpec("grid_phrase_b", 112.0, 8, 1.00, "wide", pause_seconds=0.22),
                SegmentSpec("grid_phrase_c", 108.0, 8, 1.06, "wide", pause_seconds=0.30),
                SegmentSpec("grid_turn", 104.0, 4, 1.08, "tight"),
            ],
        ),
        build_song_definition(
            "tempo_transition_stress",
            "Tempo Transition Stress",
            "Three tempo changes and pauses to stress relock behavior.",
            104.0,
            [
                SegmentSpec("stress_base", 104.0, 6, 1.00, "tight", pause_seconds=0.24),
                SegmentSpec("stress_lift", 118.0, 4, 1.04, "tight", pause_seconds=0.20),
                SegmentSpec("stress_peak", 132.0, 4, 1.08, "tight", pause_seconds=0.26),
                SegmentSpec("stress_drop", 96.0, 6, 1.12, "wide", pause_seconds=0.22),
                SegmentSpec("stress_recover", 124.0, 4, 1.04, "tight"),
            ],
        ),
        build_song_definition(
            "generic_reference_sample",
            "Generic Reference Sample",
            "Reference subtraction and pause false-positive benchmark.",
            110.0,
            [
                SegmentSpec("reference_open", 110.0, 8, 0.96, "wide", pause_seconds=0.35),
                SegmentSpec("reference_dense", 114.0, 4, 1.00, "tight", pause_seconds=0.32),
                SegmentSpec("reference_sparse", 110.0, 6, 0.92, "wide", pause_seconds=0.40),
                SegmentSpec("reference_reset", 106.0, 4, 0.98, "tight"),
            ],
        ),
        build_song_definition(
            "reference_live_calibration",
            "Reference Live Calibration",
            "Latency-style calibration file with repeated returns and clear pauses.",
            120.0,
            [
                SegmentSpec("calibration_lock", 120.0, 6, 1.08, "tight", pause_seconds=0.30),
                SegmentSpec("calibration_shift", 124.0, 4, 1.10, "tight", pause_seconds=0.26),
                SegmentSpec("calibration_hold", 120.0, 6, 1.05, "wide", pause_seconds=0.34),
                SegmentSpec("calibration_slow", 116.0, 4, 1.12, "wide"),
            ],
        ),
    ]

    rendered = [render_song(song) for song in songs]
    catalog_path = OUTPUT_DIR / "benchmark_catalog.json"
    catalog_path.write_text(json.dumps({"songs": rendered}, indent=2), encoding="utf-8")
    print(f"Generated {len(rendered)} benchmark songs in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
