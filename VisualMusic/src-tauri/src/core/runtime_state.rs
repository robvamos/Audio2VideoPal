use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimingState {
    pub sync_state: String,
    pub bpm: Option<f64>,
    pub meter: String,
    pub bar: Option<u64>,
    pub beat_in_bar: Option<u8>,
    pub next_beat_sec: Option<f64>,
    pub next_downbeat_sec: Option<f64>,
    pub tempo_confidence: f64,
    pub phase_confidence: f64,
    pub downbeat_confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineContext {
    pub run_id: String,
    pub source_type: String,
    pub sample_rate: u32,
    pub current_time_sec: f64,
    pub latest_bpm: Option<f64>,
    pub latest_timing_state: Option<TimingState>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OneBarGridResult {
    pub beat_labels: Vec<u8>,
    pub current_beat: u8,
    pub one_bar_grid_score: f64,
    pub bpm_confidence: f64,
    pub downbeat_error_ms: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WiringDescription {
    pub profile: String,
    pub active_modules: Vec<String>,
    pub disabled_modules: Vec<String>,
    pub module_edges: Vec<[String; 2]>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListeningTelemetry {
    pub run_id: String,
    pub profile: String,
    pub source: String,
    pub status: String,
    pub fused_bpm: f64,
    pub bpm_confidence: f64,
    pub sync_state: String,
    pub downbeat_confidence: f64,
    pub one_bar_grid_score: f64,
    pub wiring: WiringDescription,
    pub recommendations: Vec<String>,
    pub telemetry_json_path: String,
    pub telemetry_summary_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListeningRunResult {
    pub timing_state: TimingState,
    pub one_bar_grid: OneBarGridResult,
    pub telemetry: ListeningTelemetry,
}
