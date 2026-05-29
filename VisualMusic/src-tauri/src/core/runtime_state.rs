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
pub struct FlowProbeTelemetry {
    pub target_type: String,
    pub target_id: String,
    pub display_name: String,
    pub signal_kind: String,
    pub samples: Vec<f64>,
    pub hit_indexes: Vec<usize>,
    pub memory_sec: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreprocessingTelemetry {
    pub self_reference_enabled: bool,
    pub reference_mix_ratio: f64,
    pub residual_energy_ratio: f64,
    pub cancellation_db: f64,
    pub latency_alignment_ms: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestSongDefinition {
    pub id: String,
    pub focus: String,
    pub expected_outcome: String,
    pub file_path: Option<String>,
    pub bpm_hint: Option<f64>,
    pub meter_hint: Option<String>,
    pub duration_hint_sec: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StructureSegment {
    pub label: String,
    pub start_ratio: f64,
    pub end_ratio: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StructureComparison {
    pub target_label: String,
    pub average_error_ratio: f64,
    pub segment_offset_ratio: f64,
    pub segment_scale_ratio: f64,
    pub reference_segments: Vec<StructureSegment>,
    pub reconstructed_segments: Vec<StructureSegment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearningEvaluationEntry {
    pub timestamp: String,
    pub song_id: String,
    pub rating: String,
    pub note: String,
    pub average_error_ratio: f64,
    pub segment_offset_ratio: f64,
    pub segment_scale_ratio: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchmarkRunEntry {
    pub timestamp: String,
    pub song_id: String,
    pub profile: String,
    pub source: String,
    pub sync_state: String,
    pub fused_bpm: f64,
    pub bpm_confidence: f64,
    pub downbeat_confidence: f64,
    pub one_bar_grid_score: f64,
    pub residual_energy_ratio: f64,
    pub cancellation_db: f64,
    pub file_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterSetupDefinition {
    pub id: String,
    pub name: String,
    pub description: String,
    pub goal: String,
    pub modules: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterSetupEvaluationEntry {
    pub timestamp: String,
    pub setup_id: String,
    pub rating: String,
    pub note: String,
    pub goal: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearningTelemetry {
    pub current_stage: String,
    pub rating_scale: Vec<String>,
    pub test_songs: Vec<TestSongDefinition>,
    pub filter_setups: Vec<FilterSetupDefinition>,
    pub structure_comparison: StructureComparison,
    pub benchmark_run_history: Vec<BenchmarkRunEntry>,
    pub evaluation_history: Vec<LearningEvaluationEntry>,
    pub setup_evaluation_history: Vec<FilterSetupEvaluationEntry>,
    pub next_milestones: Vec<String>,
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
    pub preprocessing: PreprocessingTelemetry,
    pub learning: LearningTelemetry,
    pub wiring: WiringDescription,
    pub module_probes: Vec<FlowProbeTelemetry>,
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
