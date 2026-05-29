use crate::core::runtime_state::TestSongDefinition;
use crate::db::ensure_data_dir;
use std::fs;

const BENCHMARK_LIBRARY_PATH: &str = "data/benchmark_song_library.json";

fn default_benchmark_library() -> Vec<TestSongDefinition> {
    vec![
        TestSongDefinition {
            id: "phase_alignment_drill".to_string(),
            focus: "beat_1_and_phase".to_string(),
            expected_outcome: "Fast phase lock with clean quarter ordering.".to_string(),
            file_path: None,
            bpm_hint: Some(112.0),
            meter_hint: Some("4/4".to_string()),
            duration_hint_sec: Some(16.0),
            notes: Some("Use this as the baseline phase and beat-1 drill.".to_string()),
        },
        TestSongDefinition {
            id: "grid16_phrase_map".to_string(),
            focus: "long_phrase_tracking".to_string(),
            expected_outcome: "Stable 4-bar and 16-grid phrase awareness.".to_string(),
            file_path: None,
            bpm_hint: Some(112.0),
            meter_hint: Some("4/4".to_string()),
            duration_hint_sec: Some(16.0),
            notes: Some("Preferred target for map puzzle comparisons.".to_string()),
        },
        TestSongDefinition {
            id: "tempo_transition_stress".to_string(),
            focus: "relock_and_resync".to_string(),
            expected_outcome: "Controlled relock after tempo transitions.".to_string(),
            file_path: None,
            bpm_hint: None,
            meter_hint: Some("4/4".to_string()),
            duration_hint_sec: None,
            notes: Some("Use a track with noticeable tempo or phrasing transitions.".to_string()),
        },
        TestSongDefinition {
            id: "generic_reference_sample".to_string(),
            focus: "reference_subtraction".to_string(),
            expected_outcome: "Residual self-output energy remains low after preprocessing.".to_string(),
            file_path: None,
            bpm_hint: None,
            meter_hint: Some("4/4".to_string()),
            duration_hint_sec: None,
            notes: Some("Best with a dense and repetitive backing track.".to_string()),
        },
        TestSongDefinition {
            id: "reference_live_calibration".to_string(),
            focus: "latency_alignment".to_string(),
            expected_outcome: "Reference alignment stays usable under live routing latency.".to_string(),
            file_path: None,
            bpm_hint: None,
            meter_hint: Some("4/4".to_string()),
            duration_hint_sec: None,
            notes: Some("Use a file representative of the live routing path.".to_string()),
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
