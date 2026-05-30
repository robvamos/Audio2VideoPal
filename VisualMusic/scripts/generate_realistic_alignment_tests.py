from __future__ import annotations

import json
import shutil
import subprocess
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TEST_ROOT = ROOT / "benchmarks" / "realistic-alignment-tests"
SOURCE_DIR = TEST_ROOT / "source"
AUDIO_DIR = TEST_ROOT / "audio"
CATALOG_PATH = TEST_ROOT / "catalog.json"
FFMPEG = ROOT.parent / ".tools" / "ffmpeg" / "bin" / "ffmpeg.exe"


SOURCES = [
    {
        "id": "rock_drum_loop_122_bpm",
        "url": "https://www.orangefreesounds.com/wp-content/uploads/2016/06/Rock-drum-loop-122-bpm.mp3",
        "source_page": "https://orangefreesounds.com/rock-drum-loop/",
        "license": "CC BY 4.0",
        "kind": "drum_loop",
    },
    {
        "id": "ethereal_vocals",
        "url": "https://orangefreesounds.com/wp-content/uploads/2023/03/Ethereal-vocals.mp3",
        "source_page": "https://orangefreesounds.com/ethereal-vocals/",
        "license": "CC BY-NC 4.0",
        "kind": "vocal_texture",
    },
    {
        "id": "angelic_singing",
        "url": "https://orangefreesounds.com/wp-content/uploads/2023/03/Angelic-singing-sound-effect.mp3",
        "source_page": "https://orangefreesounds.com/angelic-singing-sound-effect/",
        "license": "CC BY-NC 4.0",
        "kind": "vocal_texture",
    },
]


def ensure_dirs() -> None:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)


def download(url: str, output_path: Path) -> None:
    if output_path.exists() and output_path.stat().st_size > 0:
        return
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/136.0 Safari/537.36"
            ),
            "Accept": "audio/mpeg,audio/*;q=0.9,*/*;q=0.8",
            "Referer": "https://orangefreesounds.com/",
        },
    )
    with urllib.request.urlopen(request) as response, output_path.open("wb") as handle:
        shutil.copyfileobj(response, handle)


def run_ffmpeg(args: list[str]) -> None:
    subprocess.run([str(FFMPEG), "-y", *args], check=True)


def prepare_sources() -> dict[str, Path]:
    paths: dict[str, Path] = {}
    for item in SOURCES:
        path = SOURCE_DIR / f"{item['id']}.mp3"
        download(item["url"], path)
        paths[item["id"]] = path
    return paths


def build_song_entry(
    *,
    song_id: str,
    title: str,
    audio_file: str,
    bpm: float,
    duration_seconds: float,
    sections: list[dict],
    suite: str,
    notes: str,
    evaluation_weight: float,
) -> dict:
    beats_per_bar = 4
    beat_period = 60.0 / bpm
    tempo_changes = []
    normalized_sections = []
    beat_markers = []
    known_downbeats = []
    global_bar_index = 1

    for section in sections:
        start = float(section["start_sec"])
        end = float(section["end_sec"])
        bars = max(1, int(round((end - start) / (beat_period * beats_per_bar))))
        normalized_sections.append(
            {
                "label": section["label"],
                "start_sec": round(start, 6),
                "bars": bars,
                "bpm": bpm,
            }
        )
        tempo_changes.append(
            {
                "label": section["label"],
                "start_sec": round(start, 6),
                "bpm": bpm,
            }
        )
        for local_bar in range(bars):
            bar_start = start + (local_bar * beat_period * beats_per_bar)
            if bar_start >= end - 0.01:
                break
            known_downbeats.append(
                {
                    "time_sec": round(bar_start, 6),
                    "bar_index": global_bar_index,
                    "beat_in_bar": 1,
                    "bpm": bpm,
                    "section": section["label"],
                    "is_downbeat": True,
                }
            )
            for beat_in_bar in range(1, beats_per_bar + 1):
                beat_time = bar_start + ((beat_in_bar - 1) * beat_period)
                if beat_time >= end - 0.005:
                    break
                beat_markers.append(
                    {
                        "time_sec": round(beat_time, 6),
                        "bar_index": global_bar_index,
                        "beat_in_bar": beat_in_bar,
                        "bpm": bpm,
                        "section": section["label"],
                        "is_downbeat": beat_in_bar == 1,
                    }
                )
            global_bar_index += 1

    return {
        "id": song_id,
        "title": title,
        "purpose": notes,
        "meter": "4/4",
        "suite": suite,
        "evaluation_weight": evaluation_weight,
        "total_bars": max(1, global_bar_index - 1),
        "duration_seconds": duration_seconds,
        "expected_primary_bpm": bpm,
        "tempo_changes": tempo_changes,
        "pause_windows": [],
        "known_downbeats": known_downbeats,
        "beat_markers": beat_markers,
        "sections": normalized_sections,
        "audio_file": audio_file,
    }


def generate_tracks(paths: dict[str, Path]) -> list[dict]:
    generated: list[dict] = []

    synth120 = ROOT / "benchmarks" / "public-bpm-tests" / "source-mp3" / "synth_movement_music_loop_120_bpm.mp3"
    piano105 = ROOT / "benchmarks" / "public-bpm-tests" / "source-mp3" / "ambient_piano_loop_105_bpm.mp3"
    polaris110 = ROOT / "benchmarks" / "public-bpm-tests" / "source-mp3" / "music_loop_polaris_110_bpm.mp3"
    chill95 = ROOT / "benchmarks" / "public-bpm-tests" / "source-mp3" / "free_chill_loop_95_bpm.mp3"

    full_band_vocal = AUDIO_DIR / "level_06_full_band_with_voice_120_bpm.wav"
    run_ffmpeg(
        [
            "-stream_loop",
            "-1",
            "-i",
            str(synth120),
            "-stream_loop",
            "-1",
            "-i",
            str(piano105),
            "-stream_loop",
            "-1",
            "-i",
            str(polaris110),
            "-stream_loop",
            "-1",
            "-i",
            str(paths["ethereal_vocals"]),
            "-filter_complex",
            (
                "[0:a]atrim=0:48,volume=0.72[a0];"
                "[1:a]atempo=1.142857,atrim=0:48,volume='if(between(t,8,24)+between(t,32,48),0.32,0)'[a1];"
                "[2:a]atempo=1.090909,atrim=0:48,volume='if(between(t,24,32)+between(t,40,48),0.28,0)'[a2];"
                "[3:a]atrim=0:48,volume='if(between(t,24,32)+between(t,40,48),0.18,0)'[a3];"
                "[a0][a1][a2][a3]amix=inputs=4:normalize=0,alimiter=limit=0.92,pan=mono|c0=.5*c0+.5*c1[out]"
            ),
            "-map",
            "[out]",
            "-ar",
            "44100",
            "-ac",
            "1",
            str(full_band_vocal),
        ]
    )
    generated.append(
        {
            "id": "level_06_full_band_with_voice_120_bpm",
            "title": "Level 06 Full Band With Voice 120 BPM",
            "bpm": 120,
            "meter": "4/4",
            "duration_seconds": 48.0,
            "type": "full_band_with_voice",
            "sections": [
                {"label": "intro", "start_sec": 0, "end_sec": 8},
                {"label": "verse", "start_sec": 8, "end_sec": 24},
                {"label": "chorus", "start_sec": 24, "end_sec": 32},
                {"label": "verse_return", "start_sec": 32, "end_sec": 40},
                {"label": "chorus_return", "start_sec": 40, "end_sec": 48},
            ],
            "notes": "Synthetic full-band style piece with layered harmonic support and vocal texture sections.",
            "local_wav": f"realistic-alignment-tests/audio/{full_band_vocal.name}",
        }
    )

    rock_sections = AUDIO_DIR / "level_07_full_song_sections_122_bpm.wav"
    run_ffmpeg(
        [
            "-stream_loop",
            "-1",
            "-i",
            str(paths["rock_drum_loop_122_bpm"]),
            "-stream_loop",
            "-1",
            "-i",
            str(polaris110),
            "-stream_loop",
            "-1",
            "-i",
            str(paths["angelic_singing"]),
            "-filter_complex",
            (
                "[0:a]atrim=0:56,volume=0.84[a0];"
                "[1:a]atempo=1.109091,atrim=0:56,volume='if(between(t,8,24)+between(t,32,48),0.24,0)'[a1];"
                "[2:a]atrim=0:56,volume='if(between(t,24,32)+between(t,48,56),0.14,0)'[a2];"
                "[a0][a1][a2]amix=inputs=3:normalize=0,alimiter=limit=0.92,pan=mono|c0=.5*c0+.5*c1[out]"
            ),
            "-map",
            "[out]",
            "-ar",
            "44100",
            "-ac",
            "1",
            str(rock_sections),
        ]
    )
    generated.append(
        {
            "id": "level_07_full_song_sections_122_bpm",
            "title": "Level 07 Full Song Sections 122 BPM",
            "bpm": 122,
            "meter": "4/4",
            "duration_seconds": 56.0,
            "type": "sectional_rock_band",
            "sections": [
                {"label": "intro", "start_sec": 0, "end_sec": 8},
                {"label": "riff_a", "start_sec": 8, "end_sec": 24},
                {"label": "lift", "start_sec": 24, "end_sec": 32},
                {"label": "riff_b", "start_sec": 32, "end_sec": 48},
                {"label": "outro", "start_sec": 48, "end_sec": 56},
            ],
            "notes": "Rock-oriented sectional piece with a stronger drum anchor and sparse vocal layer on lifts.",
            "local_wav": f"realistic-alignment-tests/audio/{rock_sections.name}",
        }
    )

    ambiguous = AUDIO_DIR / "level_10_ambiguous_half_double_time_95_bpm.wav"
    run_ffmpeg(
        [
            "-stream_loop",
            "-1",
            "-i",
            str(chill95),
            "-f",
            "lavfi",
            "-t",
            "40",
            "-i",
            "aevalsrc='if(eq(mod(floor(t*190/60),2),0),0.55*sin(2*PI*1800*t),0)':s=44100",
            "-f",
            "lavfi",
            "-t",
            "40",
            "-i",
            "aevalsrc='if(eq(mod(floor(t*95/60),4),0),0.35*sin(2*PI*120*t),0)':s=44100",
            "-filter_complex",
            (
                "[0:a]atrim=0:40,volume=0.74[a0];"
                "[1:a]volume=0.10[a1];"
                "[2:a]volume=0.12[a2];"
                "[a0][a1][a2]amix=inputs=3:normalize=0,alimiter=limit=0.92,pan=mono|c0=.5*c0+.5*c1[out]"
            ),
            "-map",
            "[out]",
            "-ar",
            "44100",
            "-ac",
            "1",
            str(ambiguous),
        ]
    )
    generated.append(
        {
            "id": "level_10_ambiguous_half_double_time_95_bpm",
            "title": "Level 10 Ambiguous Half Double Time 95 BPM",
            "bpm": 95,
            "meter": "4/4",
            "duration_seconds": 40.0,
            "type": "half_double_time_ambiguity",
            "sections": [
                {"label": "steady_loop", "start_sec": 0, "end_sec": 40}
            ],
            "notes": "95 BPM groove with an added high-rate pulse layer to pressure-test half/double-time confusion.",
            "local_wav": f"realistic-alignment-tests/audio/{ambiguous.name}",
        }
    )

    return generated


def write_catalog(generated: list[dict]) -> None:
    songs = [
        build_song_entry(
            song_id=item["id"],
            title=item["title"],
            audio_file=item["local_wav"],
            bpm=item["bpm"],
            duration_seconds=item["duration_seconds"],
            sections=item["sections"],
            suite="realistic_alignment",
            notes=item["notes"],
            evaluation_weight=1.3,
        )
        for item in generated
    ]
    catalog = {
        "collection": "realistic-alignment-tests",
        "version": "0.1.0",
        "description": "More realistic alignment tests with denser arrangements, vocal textures, and section changes.",
        "sources": SOURCES,
        "generated_tracks": generated,
        "songs": songs,
        "notes": [
            "These files are designed to be harder than clean synthetic benchmarks.",
            "They are meant to stress timing lock, beat stabilization, phase continuity, section boundaries and vocal interference.",
        ],
    }
    CATALOG_PATH.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    ensure_dirs()
    paths = prepare_sources()
    generated = generate_tracks(paths)
    write_catalog(generated)
    print(json.dumps({"generated": [item["id"] for item in generated]}, indent=2))


if __name__ == "__main__":
    main()
