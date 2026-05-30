use crate::core::runtime_state::TestSongDefinition;
use crate::db::ensure_data_dir;
use std::fs;

const BENCHMARK_LIBRARY_PATH: &str = "data/benchmark_song_library.json";

fn benchmark_song(
    id: &str,
    focus: &str,
    expected_outcome: &str,
    file_path: &str,
    bpm_hint: f64,
    duration_hint_sec: f64,
    notes: &str,
) -> TestSongDefinition {
    TestSongDefinition {
        id: id.to_string(),
        focus: focus.to_string(),
        expected_outcome: expected_outcome.to_string(),
        file_path: Some(file_path.to_string()),
        bpm_hint: Some(bpm_hint),
        meter_hint: Some("4/4".to_string()),
        duration_hint_sec: Some(duration_hint_sec),
        notes: Some(notes.to_string()),
    }
}

fn default_benchmark_library() -> Vec<TestSongDefinition> {
    vec![
        benchmark_song(
            "phase_alignment_drill",
            "beat_1_and_phase",
            "Fast phase lock with clean quarter ordering across short pauses and return pivots.",
            "benchmarks/audio/phase_alignment_drill.wav",
            96.0,
            60.655,
            "24 bars, 3 pause windows, tempo zones 96 -> 100 -> 96 -> 92 BPM. Baseline phase and beat-1 drill.",
        ),
        benchmark_song(
            "grid16_phrase_map",
            "long_phrase_tracking",
            "Stable 4-bar and 16-grid phrase awareness across phrase zones and a closing slowdown.",
            "benchmarks/audio/grid16_phrase_map.wav",
            108.0,
            62.729,
            "28 bars, 3 pauses, tempo zones 108 -> 112 -> 108 -> 104 BPM. Preferred map puzzle reference.",
        ),
        benchmark_song(
            "tempo_transition_stress",
            "relock_and_resync",
            "Controlled relock after multiple tempo transitions and explicit silent breaks.",
            "benchmarks/audio/tempo_transition_stress.wav",
            104.0,
            52.916,
            "24 bars, 4 pauses, tempo zones 104 -> 118 -> 132 -> 96 -> 124 BPM. Main re-lock stress test.",
        ),
        benchmark_song(
            "generic_reference_sample",
            "reference_subtraction",
            "Residual self-output energy remains low and pauses do not create false pulses.",
            "benchmarks/audio/generic_reference_sample.wav",
            110.0,
            49.093,
            "22 bars, 3 pauses, tempo zones 110 -> 114 -> 110 -> 106 BPM. Good for subtraction and pause false positives.",
        ),
        benchmark_song(
            "reference_live_calibration",
            "latency_alignment",
            "Reference alignment stays usable through returns, pauses and small calibration tempo offsets.",
            "benchmarks/audio/reference_live_calibration.wav",
            120.0,
            40.918,
            "20 bars, 3 pauses, tempo zones 120 -> 124 -> 120 -> 116 BPM. Useful for latency and reference return checks.",
        ),
    ]
}

pub fn load_benchmark_song_library() -> Vec<TestSongDefinition> {
    let defaults = default_benchmark_library();
    let Ok(content) = fs::read_to_string(BENCHMARK_LIBRARY_PATH) else {
        return defaults;
    };

    let Ok(saved_entries) = serde_json::from_str::<Vec<TestSongDefinition>>(&content) else {
        return defaults;
    };

    defaults
        .into_iter()
        .map(|default_song| {
            saved_entries
                .iter()
                .find(|saved_song| saved_song.id == default_song.id)
                .cloned()
                .unwrap_or(default_song)
        })
        .collect()
}

pub fn find_benchmark_song(song_id: &str) -> Option<TestSongDefinition> {
    load_benchmark_song_library()
        .into_iter()
        .find(|song| song.id == song_id)
}

pub fn save_benchmark_song_library(songs: &[TestSongDefinition]) -> Result<(), String> {
    ensure_data_dir()?;
    fs::write(
        BENCHMARK_LIBRARY_PATH,
        serde_json::to_string_pretty(songs).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())
}

pub fn bind_song_to_file_source(
    song_id: &str,
    file_path: &str,
    bpm_hint: Option<f64>,
    meter_hint: Option<String>,
    duration_hint_sec: Option<f64>,
) -> Result<Vec<TestSongDefinition>, String> {
    let mut songs = load_benchmark_song_library();
    let song = songs
        .iter_mut()
        .find(|item| item.id == song_id)
        .ok_or_else(|| format!("Unknown benchmark song id: {song_id}"))?;

    song.file_path = if file_path.trim().is_empty() {
        None
    } else {
        Some(file_path.trim().to_string())
    };
    song.bpm_hint = bpm_hint;
    song.meter_hint = meter_hint
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    song.duration_hint_sec = duration_hint_sec;

    save_benchmark_song_library(&songs)?;
    Ok(songs)
}
