use crate::core::event::PipelineEvent;
use serde_json::json;

pub struct SyntheticPatternSource {
    pub bpm: f64,
    pub meter: String,
    pub duration_sec: f64,
    pub sample_rate: u32,
}

impl SyntheticPatternSource {
    pub fn new(bpm: f64, meter: String, duration_sec: f64) -> Self {
        Self {
            bpm,
            meter,
            duration_sec,
            sample_rate: 44_100,
        }
    }

    pub fn emit_frames(&self) -> Vec<PipelineEvent> {
        let beat_period_sec = 60.0 / self.bpm;
        let beat_count = (self.duration_sec / beat_period_sec).floor() as usize;

        (0..beat_count)
            .map(|index| PipelineEvent {
                event_id: format!("synthetic-frame-{index:04}"),
                event_type: "audio_frame".to_string(),
                producer: "SyntheticPatternSource".to_string(),
                time_sec: index as f64 * beat_period_sec,
                confidence: Some(1.0),
                latency_ms: Some(0.0),
                payload: json!({
                    "meter": self.meter,
                    "bpm": self.bpm,
                    "beat_in_bar": (index % 4) + 1,
                    "sample_rate": self.sample_rate,
                }),
                trace_id: "synthetic-pattern-trace".to_string(),
            })
            .collect()
    }
}
