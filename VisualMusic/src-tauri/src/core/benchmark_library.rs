use crate::core::runtime_state::TestSongDefinition;
use crate::db::ensure_data_dir;
use std::fs;

const BENCHMARK_LIBRARY_PATH: &str = "data/benchmark_song_library.json";

fn default_benchmark_library() -> Vec<TestSongDefinition> {
    vec![
        TestSongDefinition {
            id: "phase_alignment_drill".to_string(),
            focus: "beat_1_and_phase".to_string(),
            expected_outcome: "Fast phase lock with clean quarter ordering across short pauses and return pivots.".to_string(),
            file_path: Some("benchmarks/audio/phase_alignment_drill.wav".to_string()),
            bpm_hint: Some(96.0),
            meter_hint: Some("4/4".to_string()),
            duration_hint_sec: Some(60.655),
            notes: Some(
                "24 bars, 3 pause windows, tempo zones 96 -> 100 -> 96 -> 92 BPM. Baseline phase and beat-1 drill."
                    .to_string(),
            ),
        },
        TestSongDefinition {
            id: "grid16_phrase_map".to_string(),
            focus: "long_phrase_tracking".to_string(),
            expected_outcome: "Stable 4-bar and 16-grid phrase awareness across phrase zones and a closing slowdown.".to_string(),
            file_path: Some("benchmarks/audio/grid16_phrase_map.wav".to_string()),
            bpm_hint: Some(108.0),
            meter_hint: Some("4/4".to_string()),
            duration_hint_sec: Some(62.729),
            notes: Some(
                "28 bars, 3 pauses, tempo zones 108 -> 112 -> 108 -> 104 BPM. Preferred map puzzle reference."
                    .to_string(),
            ),
        },
        TestSongDefinition {
            id: "tempo_transition_stress".to_string(),
            focus: "relock_and_resync".to_string(),
            expected_outcome: "Controlled relock after multiple tempo transitions and explicit silent breaks.".to_string(),
            file_path: Some("benchmarks/audio/tempo_transition_stress.wav".to_string()),
            bpm_hint: Some(104.0),
            meter_hint: Some("4/4".to_string()),
            duration_hint_sec: Some(52.916),
            notes: Some(
                "24 bars, 4 pauses, tempo zones 104 -> 118 -> 132 -> 96 -> 124 BPM. Main re-lock stress test."
                    .to_string(),
            ),
        },
        TestSongDefinition {
            id: "generic_reference_sample".to_string(),
            focus: "reference_subtraction".to_string(),
            expected_outcome: "Residual self-output energy remains low and pauses do not create false pulses.".to_string(),
            file_path: Some("benchmarks/audio/generic_reference_sample.wav".to_string()),
            bpm_hint: Some(110.0),
            meter_hint: Some("4/4".to_string()),
            duration_hint_sec: Some(49.093),
            notes: Some(
                "22 bars, 3 pauses, tempo zones 110 -> 114 -> 110 -> 106 BPM. Good for subtraction and pause false positives."
                    .to_string(),
            ),
        },
        TestSongDefinition {
            id: "reference_live_calibration".to_string(),
            focus: "latency_alignment".to_string(),
            expected_outcome: "Reference alignment stays usable through returns, pauses and small calibration tempo offsets.".to_string(),
            file_path: Some("benchmarks/audio/reference_live_calibration.wav".to_string()),
            bpm_hint: Some(120.0),
            meter_hint: Some("4/4".to_string()),
            duration_hint_sec: Some(40.918),
            notes: Some(
                "20 bars, 3 pauses, tempo zones 120 -> 124 -> 120 -> 116 BPM. Useful for latency and reference return checks."
                    .to_string(),
            ),
        },
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
