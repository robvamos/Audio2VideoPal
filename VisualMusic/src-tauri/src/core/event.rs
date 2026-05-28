use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineEvent {
    pub event_id: String,
    pub event_type: String,
    pub producer: String,
    pub time_sec: f64,
    pub confidence: Option<f64>,
    pub latency_ms: Option<f64>,
    pub payload: serde_json::Value,
    pub trace_id: String,
}
