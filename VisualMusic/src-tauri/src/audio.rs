use crate::core::pipeline::run_minimal_pipeline;
use crate::core::runtime_state::{
    FilterSetupEvaluationEntry, LearningEvaluationEntry, ListeningRunResult, ListeningTelemetry,
    StructureSegment, TimingState,
};
use crate::core::benchmark_library::{bind_song_to_file_source, find_benchmark_song};
use crate::db::{ensure_data_dir, open_db};
use crate::db::log_event;
use crate::sources::file_source::{load_file_source_state, save_file_source_state, FileSourceState};
use chrono::Local;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::{Mutex, OnceLock};

#[derive(Default)]
struct ListeningRuntimeStore {
    active: bool,
    profile: Option<String>,
    source: Option<String>,
    latest_timing_state: Option<TimingState>,
    latest_telemetry: Option<ListeningTelemetry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StructureLearningTuning {
    segment_offset_ratio: f64,
    segment_scale_ratio: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MapPuzzleViewState {
    selected_song_id: String,
    selected_setup_id: String,
    edge_filter: String,
    compare_mode: String,
    diagnostics_lens: String,
    memory_note: String,
    analyzer_target_type: Option<String>,
    analyzer_target_id: String,
    analyzer_window: String,
}

impl Default for StructureLearningTuning {
    fn default() -> Self {
        Self {
            segment_offset_ratio: -0.03,
            segment_scale_ratio: 1.08,
        }
    }
}

impl Default for MapPuzzleViewState {
    fn default() -> Self {
        Self {
            selected_song_id: "grid16_phrase_map".to_string(),
            selected_setup_id: "phase_grid_focus".to_string(),
            edge_filter: "all".to_string(),
            compare_mode: "split".to_string(),
            diagnostics_lens: "timing".to_string(),
            memory_note: String::new(),
            analyzer_target_type: Some("module".to_string()),
            analyzer_target_id: "tempo_autocorrelation".to_string(),
            analyzer_window: "medium".to_string(),
        }
    }
}

const STRUCTURE_TUNING_PATH: &str = "data/learning_structure_tuning.json";
const LEARNING_EVALUATIONS_PATH: &str = "data/learning_evaluations.json";
const MAP_PUZZLE_STATE_PATH: &str = "data/map_puzzle_state.json";

fn runtime_store() -> &'static Mutex<ListeningRuntimeStore> {
    static STORE: OnceLock<Mutex<ListeningRuntimeStore>> = OnceLock::new();
    STORE.get_or_init(|| Mutex::new(ListeningRuntimeStore::default()))
}

fn load_structure_learning_tuning() -> StructureLearningTuning {
    if let Ok(content) = fs::read_to_string(STRUCTURE_TUNING_PATH) {
        if let Ok(tuning) = serde_json::from_str::<StructureLearningTuning>(&content) {
            return tuning;
        }
    }

    StructureLearningTuning::default()
}

fn save_structure_learning_tuning(tuning: &StructureLearningTuning) -> Result<(), String> {
    ensure_data_dir()?;
    fs::write(
        STRUCTURE_TUNING_PATH,
        serde_json::to_string_pretty(tuning).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())
}

fn load_legacy_learning_evaluations() -> Vec<LearningEvaluationEntry> {
    if let Ok(content) = fs::read_to_string(LEARNING_EVALUATIONS_PATH) {
        if let Ok(entries) = serde_json::from_str::<Vec<LearningEvaluationEntry>>(&content) {
            return entries;
        }
    }

    Vec::new()
}

fn load_map_puzzle_state_file() -> MapPuzzleViewState {
    if let Ok(content) = fs::read_to_string(MAP_PUZZLE_STATE_PATH) {
        if let Ok(state) = serde_json::from_str::<MapPuzzleViewState>(&content) {
            return state;
        }
    }

    MapPuzzleViewState::default()
}

fn save_map_puzzle_state_file(state: &MapPuzzleViewState) -> Result<(), String> {
    ensure_data_dir()?;
    fs::write(
        MAP_PUZZLE_STATE_PATH,
        serde_json::to_string_pretty(state).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())
}

fn import_legacy_learning_evaluations_if_needed() -> Result<(), String> {
    let legacy_entries = load_legacy_learning_evaluations();
    if legacy_entries.is_empty() {
        return Ok(());
    }

    let conn = open_db()?;
    let existing_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM learning_evaluations", [], |row| row.get(0))
        .map_err(|error| error.to_string())?;

    if existing_count > 0 {
        return Ok(());
    }

    for entry in legacy_entries {
        let metrics_json = serde_json::json!({
            "average_error_ratio": entry.average_error_ratio,
            "segment_offset_ratio": entry.segment_offset_ratio,
            "segment_scale_ratio": entry.segment_scale_ratio,
        })
        .to_string();

        conn.execute(
            "INSERT INTO learning_evaluations
            (created_at, entity_type, entity_key, behavior_key, configuration_key, rating, note, metrics_json)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                entry.timestamp,
                "song",
                entry.song_id,
                "structure_reconstruction",
                "learning_lab",
                entry.rating,
                entry.note,
                metrics_json,
            ],
        )
        .map_err(|error| error.to_string())?;
    }

    Ok(())
}

fn load_learning_evaluations() -> Vec<LearningEvaluationEntry> {
    if import_legacy_learning_evaluations_if_needed().is_err() {
        return Vec::new();
    }

    let Ok(conn) = open_db() else {
        return Vec::new();
    };

    let mut statement = match conn.prepare(
        "SELECT created_at, entity_key, rating, note, metrics_json
         FROM learning_evaluations
         WHERE entity_type = 'song' AND behavior_key = 'structure_reconstruction'
         ORDER BY created_at DESC
         LIMIT 50",
    ) {
        Ok(statement) => statement,
        Err(_) => return Vec::new(),
    };

    let rows = match statement.query_map([], |row| {
        let created_at: String = row.get(0)?;
        let song_id: String = row.get(1)?;
        let rating: String = row.get(2)?;
        let note: String = row.get(3)?;
        let metrics_json: String = row.get(4)?;
        let metrics: serde_json::Value =
            serde_json::from_str(&metrics_json).unwrap_or_else(|_| serde_json::json!({}));

        Ok(LearningEvaluationEntry {
            timestamp: created_at,
            song_id,
            rating,
            note,
            average_error_ratio: metrics
                .get("average_error_ratio")
                .and_then(|value| value.as_f64())
                .unwrap_or_default(),
            segment_offset_ratio: metrics
                .get("segment_offset_ratio")
                .and_then(|value| value.as_f64())
                .unwrap_or_default(),
            segment_scale_ratio: metrics
                .get("segment_scale_ratio")
                .and_then(|value| value.as_f64())
                .unwrap_or(1.0),
        })
    }) {
        Ok(rows) => rows,
        Err(_) => return Vec::new(),
    };

    rows.filter_map(Result::ok).collect()
}

fn load_filter_setup_evaluations() -> Vec<FilterSetupEvaluationEntry> {
    if import_legacy_learning_evaluations_if_needed().is_err() {
        return Vec::new();
    }

    let Ok(conn) = open_db() else {
        return Vec::new();
    };

    let mut statement = match conn.prepare(
        "SELECT created_at, entity_key, rating, note, behavior_key
         FROM learning_evaluations
         WHERE entity_type = 'filter_setup'
         ORDER BY created_at DESC
         LIMIT 50",
    ) {
        Ok(statement) => statement,
        Err(_) => return Vec::new(),
    };

    let rows = match statement.query_map([], |row| {
        Ok(FilterSetupEvaluationEntry {
            timestamp: row.get(0)?,
            setup_id: row.get(1)?,
            rating: row.get(2)?,
            note: row.get(3)?,
            goal: row.get(4)?,
        })
    }) {
        Ok(rows) => rows,
        Err(_) => return Vec::new(),
    };

    rows.filter_map(Result::ok).collect()
}

fn save_learning_evaluation_entry(entry: &LearningEvaluationEntry) -> Result<(), String> {
    let conn = open_db()?;
    let metrics_json = serde_json::json!({
        "average_error_ratio": entry.average_error_ratio,
        "segment_offset_ratio": entry.segment_offset_ratio,
        "segment_scale_ratio": entry.segment_scale_ratio,
    })
    .to_string();

    conn.execute(
        "INSERT INTO learning_evaluations
        (created_at, entity_type, entity_key, behavior_key, configuration_key, rating, note, metrics_json)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            entry.timestamp,
            "song",
            entry.song_id,
            "structure_reconstruction",
            "learning_lab",
            entry.rating,
            entry.note,
            metrics_json,
        ],
    )
    .map_err(|error| error.to_string())?;

    Ok(())
}

fn save_filter_setup_evaluation_entry(entry: &FilterSetupEvaluationEntry) -> Result<(), String> {
    let conn = open_db()?;
    conn.execute(
        "INSERT INTO learning_evaluations
        (created_at, entity_type, entity_key, behavior_key, configuration_key, rating, note, metrics_json)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            entry.timestamp,
            "filter_setup",
            entry.setup_id,
            entry.goal,
            "learning_lab",
            entry.rating,
            entry.note,
            "{}",
        ],
    )
    .map_err(|error| error.to_string())?;

    Ok(())
}

fn rebuild_segments(reference_segments: &[StructureSegment], tuning: &StructureLearningTuning) -> Vec<StructureSegment> {
    let last_index = reference_segments.len().saturating_sub(1);

    reference_segments
        .iter()
        .enumerate()
        .map(|(index, segment)| {
            let center =
                ((segment.start_ratio + segment.end_ratio) / 2.0) + tuning.segment_offset_ratio;
            let width = (segment.end_ratio - segment.start_ratio) * tuning.segment_scale_ratio;
            let start = (center - width / 2.0).clamp(0.0, 0.95);
            let end = (center + width / 2.0).clamp(start + 0.04, 1.0);

            StructureSegment {
                label: segment.label.clone(),
                start_ratio: if index == 0 { 0.0 } else { start },
                end_ratio: if index == last_index { 1.0 } else { end },
            }
        })
        .collect()
}

fn apply_structure_learning_tuning(telemetry: &mut ListeningTelemetry, tuning: &StructureLearningTuning) {
    let reference_segments = telemetry
        .learning
        .structure_comparison
        .reference_segments
        .clone();
    let rebuilt_segments = rebuild_segments(&reference_segments, tuning);
    let average_error_ratio = rebuilt_segments
        .iter()
        .zip(reference_segments.iter())
        .map(|(rebuilt, reference)| {
            (reference.start_ratio - rebuilt.start_ratio).abs()
                + (reference.end_ratio - rebuilt.end_ratio).abs()
        })
        .sum::<f64>()
        / ((rebuilt_segments.len() * 2) as f64);

    telemetry.learning.structure_comparison.segment_offset_ratio = tuning.segment_offset_ratio;
    telemetry.learning.structure_comparison.segment_scale_ratio = tuning.segment_scale_ratio;
    telemetry.learning.structure_comparison.average_error_ratio = average_error_ratio;
    telemetry.learning.structure_comparison.reconstructed_segments = rebuilt_segments;
}

fn inject_learning_history(telemetry: &mut ListeningTelemetry) {
    let mut history = load_learning_evaluations();
    history.sort_by(|left, right| right.timestamp.cmp(&left.timestamp));
    telemetry.learning.evaluation_history = history.into_iter().take(12).collect();

    let mut setup_history = load_filter_setup_evaluations();
    setup_history.sort_by(|left, right| right.timestamp.cmp(&left.timestamp));
    telemetry.learning.setup_evaluation_history = setup_history.into_iter().take(12).collect();
}

fn update_runtime_from_result(profile: &str, source: &str, result: &ListeningRunResult) {
    if let Ok(mut runtime) = runtime_store().lock() {
        runtime.active = true;
        runtime.profile = Some(profile.to_string());
        runtime.source = Some(source.to_string());
        runtime.latest_timing_state = Some(result.timing_state.clone());
        runtime.latest_telemetry = Some(result.telemetry.clone());
    }
}

fn start_pipeline(profile: &str, source: &str) -> Result<ListeningRunResult, String> {
    let mut result = run_minimal_pipeline(profile, source)?;
    let tuning = load_structure_learning_tuning();
    apply_structure_learning_tuning(&mut result.telemetry, &tuning);
    inject_learning_history(&mut result.telemetry);
    update_runtime_from_result(profile, source, &result);
    Ok(result)
}

fn apply_benchmark_context_to_result(
    result: &mut ListeningRunResult,
    song_id: &str,
) -> Result<FileSourceState, String> {
    let song = find_benchmark_song(song_id)
        .ok_or_else(|| format!("Unknown benchmark song id: {song_id}"))?;
    let file_path = song
        .file_path
        .clone()
        .ok_or_else(|| format!("Benchmark {song_id} does not have a bound file yet"))?;

    let state = FileSourceState {
        file_path,
        bpm_hint: song.bpm_hint,
        meter_hint: song.meter_hint.unwrap_or_else(|| "4/4".to_string()),
        duration_hint_sec: song.duration_hint_sec,
    };
    result.telemetry.learning.structure_comparison.target_label = song.id.clone();
    result.telemetry.learning.next_milestones.insert(
        0,
        format!("Benchmark active: {} ({})", song.id, song.focus),
    );
    result.telemetry.recommendations.insert(
        0,
        format!(
            "Current benchmark file: {}",
            state.file_path
        ),
    );

    Ok(state)
}

#[tauri::command]
pub fn start_listening_pipeline(profile: String, source: String) -> Result<String, String> {
    let result = start_pipeline(&profile, &source)?;
    log_event(
        "INFO",
        "audio_runtime",
        "LISTENING_PIPELINE_START",
        "Listening pipeline initialized",
        Some(
            &serde_json::json!({
                "profile": profile,
                "source": source,
                "run_id": result.telemetry.run_id,
            })
            .to_string(),
        ),
    );

    Ok(format!(
        "Listening pipeline started with profile '{}' on source '{}'",
        profile, source
    ))
}

#[tauri::command]
pub fn stop_listening_pipeline() -> Result<String, String> {
    if let Ok(mut runtime) = runtime_store().lock() {
        runtime.active = false;
    }

    log_event(
        "INFO",
        "audio_runtime",
        "LISTENING_PIPELINE_STOP",
        "Listening pipeline stopped",
        None,
    );
    Ok("Listening pipeline stopped".to_string())
}

#[tauri::command]
pub fn run_listening_test(profile: String, source: String) -> Result<String, String> {
    let result = start_pipeline(&profile, &source)?;
    log_event(
        "INFO",
        "audio_runtime",
        "LISTENING_PIPELINE_TEST",
        "Listening pipeline test completed",
        Some(
            &serde_json::json!({
                "profile": profile,
                "source": source,
                "fused_bpm": result.telemetry.fused_bpm,
                "sync_state": result.telemetry.sync_state,
                "one_bar_grid_score": result.telemetry.one_bar_grid_score,
            })
            .to_string(),
        ),
    );

    serde_json::to_string(&result).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_latest_timing_state() -> Result<String, String> {
    let runtime = runtime_store()
        .lock()
        .map_err(|_| "Listening runtime is unavailable".to_string())?;
    serde_json::to_string(&runtime.latest_timing_state).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_latest_telemetry() -> Result<String, String> {
    let runtime = runtime_store()
        .lock()
        .map_err(|_| "Listening runtime is unavailable".to_string())?;
    serde_json::to_string(&runtime.latest_telemetry).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn adjust_structure_learning(action: String) -> Result<String, String> {
    let mut runtime = runtime_store()
        .lock()
        .map_err(|_| "Listening runtime is unavailable".to_string())?;

    let telemetry = runtime
        .latest_telemetry
        .as_mut()
        .ok_or_else(|| "Run the listening pipeline before adjusting structure learning".to_string())?;

    let mut tuning = load_structure_learning_tuning();
    match action.as_str() {
        "shift_left" => tuning.segment_offset_ratio -= 0.01,
        "shift_right" => tuning.segment_offset_ratio += 0.01,
        "compress" => tuning.segment_scale_ratio -= 0.04,
        "expand" => tuning.segment_scale_ratio += 0.04,
        "reset" => tuning = StructureLearningTuning::default(),
        _ => return Err(format!("Unknown structure learning action: {action}")),
    }

    tuning.segment_offset_ratio = tuning.segment_offset_ratio.clamp(-0.2, 0.2);
    tuning.segment_scale_ratio = tuning.segment_scale_ratio.clamp(0.7, 1.4);

    apply_structure_learning_tuning(telemetry, &tuning);
    save_structure_learning_tuning(&tuning)?;

    log_event(
        "INFO",
        "learning_lab",
        "STRUCTURE_LEARNING_ADJUST",
        "Updated structure learning tuning",
        Some(
            &serde_json::json!({
                "action": action,
                "segment_offset_ratio": tuning.segment_offset_ratio,
                "segment_scale_ratio": tuning.segment_scale_ratio,
            })
            .to_string(),
        ),
    );

    serde_json::to_string(telemetry).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_learning_evaluation(song_id: String, rating: String, note: String) -> Result<String, String> {
    let mut runtime = runtime_store()
        .lock()
        .map_err(|_| "Listening runtime is unavailable".to_string())?;

    let telemetry = runtime
        .latest_telemetry
        .as_mut()
        .ok_or_else(|| "Run the listening pipeline before saving an evaluation".to_string())?;

    let comparison = telemetry.learning.structure_comparison.clone();
    let entry = LearningEvaluationEntry {
        timestamp: Local::now().to_rfc3339(),
        song_id: song_id.clone(),
        rating: rating.clone(),
        note: note.clone(),
        average_error_ratio: comparison.average_error_ratio,
        segment_offset_ratio: comparison.segment_offset_ratio,
        segment_scale_ratio: comparison.segment_scale_ratio,
    };

    save_learning_evaluation_entry(&entry)?;
    inject_learning_history(telemetry);

    log_event(
        "INFO",
        "learning_lab",
        "LEARNING_EVALUATION_SAVE",
        "Saved learning evaluation",
        Some(
            &serde_json::json!({
                "song_id": song_id,
                "rating": rating,
                "note": note,
                "average_error_ratio": comparison.average_error_ratio,
            })
            .to_string(),
        ),
    );

    serde_json::to_string(telemetry).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_filter_setup_evaluation(setup_id: String, rating: String, note: String) -> Result<String, String> {
    let mut runtime = runtime_store()
        .lock()
        .map_err(|_| "Listening runtime is unavailable".to_string())?;

    let telemetry = runtime
        .latest_telemetry
        .as_mut()
        .ok_or_else(|| "Run the listening pipeline before saving a setup evaluation".to_string())?;

    let goal = telemetry
        .learning
        .filter_setups
        .iter()
        .find(|setup| setup.id == setup_id)
        .map(|setup| setup.goal.clone())
        .unwrap_or_else(|| "unknown".to_string());

    let entry = FilterSetupEvaluationEntry {
        timestamp: Local::now().to_rfc3339(),
        setup_id: setup_id.clone(),
        rating: rating.clone(),
        note: note.clone(),
        goal: goal.clone(),
    };

    save_filter_setup_evaluation_entry(&entry)?;
    inject_learning_history(telemetry);

    log_event(
        "INFO",
        "learning_lab",
        "FILTER_SETUP_EVALUATION_SAVE",
        "Saved filter setup evaluation",
        Some(
            &serde_json::json!({
                "setup_id": setup_id,
                "goal": goal,
                "rating": rating,
                "note": note,
            })
            .to_string(),
        ),
    );

    serde_json::to_string(telemetry).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn load_map_puzzle_state() -> Result<String, String> {
    serde_json::to_string(&load_map_puzzle_state_file()).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_map_puzzle_state(state_json: String) -> Result<String, String> {
    let state: MapPuzzleViewState =
        serde_json::from_str(&state_json).map_err(|error| error.to_string())?;
    save_map_puzzle_state_file(&state)?;

    log_event(
        "INFO",
        "map_puzzle",
        "MAP_PUZZLE_STATE_SAVE",
        "Saved map puzzle view state",
        Some(&state_json),
    );

    Ok("ok".to_string())
}

#[tauri::command]
pub fn load_file_source_config() -> Result<String, String> {
    serde_json::to_string(&load_file_source_state()).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_file_source_config(state_json: String) -> Result<String, String> {
    let state: FileSourceState =
        serde_json::from_str(&state_json).map_err(|error| error.to_string())?;
    save_file_source_state(&state)?;

    log_event(
        "INFO",
        "listening_input",
        "FILE_SOURCE_CONFIG_SAVE",
        "Saved file source configuration",
        Some(&state_json),
    );

    Ok("ok".to_string())
}

#[tauri::command]
pub fn bind_benchmark_song_file(
    song_id: String,
    file_path: String,
    bpm_hint: Option<f64>,
    meter_hint: Option<String>,
    duration_hint_sec: Option<f64>,
) -> Result<String, String> {
    let songs = bind_song_to_file_source(
        &song_id,
        &file_path,
        bpm_hint,
        meter_hint.clone(),
        duration_hint_sec,
    )?;

    if let Ok(mut runtime) = runtime_store().lock() {
        if let Some(telemetry) = runtime.latest_telemetry.as_mut() {
            telemetry.learning.test_songs = songs.clone();
        }
    }

    let result = serde_json::to_string(&songs).map_err(|error| error.to_string())?;

    log_event(
        "INFO",
        "learning_lab",
        "BENCHMARK_FILE_BIND",
        "Bound benchmark song to file source",
        Some(
            &serde_json::json!({
                "song_id": song_id,
                "file_path": file_path,
                "bpm_hint": bpm_hint,
                "meter_hint": meter_hint,
                "duration_hint_sec": duration_hint_sec,
            })
            .to_string(),
        ),
    );

    Ok(result)
}

#[tauri::command]
pub fn load_benchmark_song_file_source(song_id: String) -> Result<String, String> {
    let song = find_benchmark_song(&song_id)
        .ok_or_else(|| format!("Unknown benchmark song id: {song_id}"))?;
    let file_path = song
        .file_path
        .clone()
        .ok_or_else(|| format!("Benchmark {song_id} does not have a bound file yet"))?;

    let state = FileSourceState {
        file_path,
        bpm_hint: song.bpm_hint,
        meter_hint: song.meter_hint.unwrap_or_else(|| "4/4".to_string()),
        duration_hint_sec: song.duration_hint_sec,
    };
    save_file_source_state(&state)?;

    log_event(
        "INFO",
        "learning_lab",
        "BENCHMARK_FILE_LOAD",
        "Loaded benchmark file into active file source",
        Some(
            &serde_json::json!({
                "song_id": song_id,
                "file_path": state.file_path,
                "bpm_hint": state.bpm_hint,
                "meter_hint": state.meter_hint,
                "duration_hint_sec": state.duration_hint_sec,
            })
            .to_string(),
        ),
    );

    serde_json::to_string(&state).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn run_benchmark_song_test(profile: String, song_id: String) -> Result<String, String> {
    let state_json = load_benchmark_song_file_source(song_id.clone())?;
    let state: FileSourceState =
        serde_json::from_str(&state_json).map_err(|error| error.to_string())?;
    let mut result = start_pipeline(&profile, "file")?;
    apply_benchmark_context_to_result(&mut result, &song_id)?;
    update_runtime_from_result(&profile, "file", &result);

    log_event(
        "INFO",
        "learning_lab",
        "BENCHMARK_TEST_RUN",
        "Listening benchmark test completed",
        Some(
            &serde_json::json!({
                "profile": profile,
                "song_id": song_id,
                "file_path": state.file_path,
                "fused_bpm": result.telemetry.fused_bpm,
                "sync_state": result.telemetry.sync_state,
                "one_bar_grid_score": result.telemetry.one_bar_grid_score,
            })
            .to_string(),
        ),
    );

    serde_json::to_string(&result).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn start_audio_stream() -> Result<String, String> {
    start_listening_pipeline(
        "minimal_one_bar_grid".to_string(),
        "synthetic_pattern".to_string(),
    )
}

#[tauri::command]
pub fn stop_audio_stream() -> Result<String, String> {
    stop_listening_pipeline()
}
