use crate::core::pipeline::run_minimal_pipeline;
use crate::core::runtime_state::{
    LearningEvaluationEntry, ListeningRunResult, ListeningTelemetry, StructureSegment, TimingState,
};
use crate::db::ensure_data_dir;
use crate::db::log_event;
use chrono::Local;
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

impl Default for StructureLearningTuning {
    fn default() -> Self {
        Self {
            segment_offset_ratio: -0.03,
            segment_scale_ratio: 1.08,
        }
    }
}

const STRUCTURE_TUNING_PATH: &str = "data/learning_structure_tuning.json";
const LEARNING_EVALUATIONS_PATH: &str = "data/learning_evaluations.json";

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

fn load_learning_evaluations() -> Vec<LearningEvaluationEntry> {
    if let Ok(content) = fs::read_to_string(LEARNING_EVALUATIONS_PATH) {
        if let Ok(entries) = serde_json::from_str::<Vec<LearningEvaluationEntry>>(&content) {
            return entries;
        }
    }

    Vec::new()
}

fn save_learning_evaluations(entries: &[LearningEvaluationEntry]) -> Result<(), String> {
    ensure_data_dir()?;
    fs::write(
        LEARNING_EVALUATIONS_PATH,
        serde_json::to_string_pretty(entries).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())
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

    let mut history = load_learning_evaluations();
    history.insert(0, entry);
    save_learning_evaluations(&history)?;
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
