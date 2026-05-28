use crate::core::pipeline::run_minimal_pipeline;
use crate::core::runtime_state::{ListeningRunResult, ListeningTelemetry, TimingState};
use crate::db::log_event;
use std::sync::{Mutex, OnceLock};

#[derive(Default)]
struct ListeningRuntimeStore {
    active: bool,
    profile: Option<String>,
    source: Option<String>,
    latest_timing_state: Option<TimingState>,
    latest_telemetry: Option<ListeningTelemetry>,
}

fn runtime_store() -> &'static Mutex<ListeningRuntimeStore> {
    static STORE: OnceLock<Mutex<ListeningRuntimeStore>> = OnceLock::new();
    STORE.get_or_init(|| Mutex::new(ListeningRuntimeStore::default()))
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
    let result = run_minimal_pipeline(profile, source)?;
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
