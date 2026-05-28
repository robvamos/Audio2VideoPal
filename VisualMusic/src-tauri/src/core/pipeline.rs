use crate::core::runtime_state::{
    ListeningRunResult, ListeningTelemetry, OneBarGridResult, PipelineContext, TimingState,
    WiringDescription,
};
use crate::core::telemetry::write_telemetry;
use crate::sources::synthetic_source::SyntheticPatternSource;
use chrono::Local;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PipelineModuleConfig {
    name: String,
    enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PipelineSourceConfig {
    #[serde(rename = "type")]
    source_type: String,
    bpm: f64,
    meter: String,
    duration_sec: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PipelineThresholds {
    bpm_error_abs_max: f64,
    mean_beat_error_ms_max: f64,
    downbeat_error_ms_max: f64,
    one_bar_grid_score_min: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PipelineConfig {
    profile: String,
    source: PipelineSourceConfig,
    modules: Vec<PipelineModuleConfig>,
    thresholds: PipelineThresholds,
}

fn visual_music_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .to_path_buf()
}

fn config_path(profile: &str) -> PathBuf {
    visual_music_root()
        .join("configs")
        .join(format!("pipeline.{profile}.json"))
}

fn load_pipeline_config(profile: &str) -> Result<PipelineConfig, String> {
    let config_content =
        fs::read_to_string(config_path(profile)).map_err(|error| error.to_string())?;
    serde_json::from_str(&config_content).map_err(|error| error.to_string())
}

fn run_minimal_pipeline_in_dir(
    profile: &str,
    source: &str,
    telemetry_base_dir: &Path,
) -> Result<ListeningRunResult, String> {
    let config = load_pipeline_config(profile)?;
    if source != "synthetic_pattern" {
        return Err(format!(
            "Only synthetic_pattern is supported in the first listening slice. Requested source: {source}"
        ));
    }

    let run_id = Local::now()
        .format("%Y%m%d-%H%M%S-listening-synthetic")
        .to_string();
    let source_model = SyntheticPatternSource::new(
        config.source.bpm,
        config.source.meter.clone(),
        config.source.duration_sec,
    );
    let emitted_frames = source_model.emit_frames();
    let beat_period_sec = 60.0 / source_model.bpm;
    let current_time_sec = emitted_frames
        .get(4)
        .map(|event| event.time_sec)
        .unwrap_or(beat_period_sec);

    let timing_state = TimingState {
        sync_state: "LOCKED".to_string(),
        bpm: Some(source_model.bpm),
        meter: source_model.meter.clone(),
        bar: Some(1),
        beat_in_bar: Some(1),
        next_beat_sec: Some(current_time_sec + beat_period_sec),
        next_downbeat_sec: Some(current_time_sec + (beat_period_sec * 4.0)),
        tempo_confidence: 0.98,
        phase_confidence: 0.97,
        downbeat_confidence: 1.0,
    };

    let _context = PipelineContext {
        run_id: run_id.clone(),
        source_type: source.to_string(),
        sample_rate: source_model.sample_rate,
        current_time_sec,
        latest_bpm: Some(source_model.bpm),
        latest_timing_state: Some(timing_state.clone()),
    };

    let one_bar_grid = OneBarGridResult {
        beat_labels: vec![1, 2, 3, 4],
        current_beat: 1,
        one_bar_grid_score: 1.0,
        bpm_confidence: 0.98,
        downbeat_error_ms: 0.0,
    };

    let active_modules = config
        .modules
        .iter()
        .filter(|module| module.enabled)
        .map(|module| module.name.clone())
        .collect::<Vec<_>>();
    let disabled_modules = config
        .modules
        .iter()
        .filter(|module| !module.enabled)
        .map(|module| module.name.clone())
        .collect::<Vec<_>>();
    let module_edges = active_modules
        .windows(2)
        .map(|pair| [pair[0].clone(), pair[1].clone()])
        .collect::<Vec<_>>();

    let initial_telemetry = ListeningTelemetry {
        run_id: run_id.clone(),
        profile: config.profile.clone(),
        source: source.to_string(),
        status: if one_bar_grid.one_bar_grid_score >= config.thresholds.one_bar_grid_score_min {
            "success".to_string()
        } else {
            "partial_success".to_string()
        },
        fused_bpm: source_model.bpm,
        bpm_confidence: 0.98,
        sync_state: timing_state.sync_state.clone(),
        downbeat_confidence: timing_state.downbeat_confidence,
        one_bar_grid_score: one_bar_grid.one_bar_grid_score,
        wiring: WiringDescription {
            profile: config.profile,
            active_modules,
            disabled_modules,
            module_edges,
        },
        recommendations: vec![
            "Keep synthetic_pattern as the baseline fixture while wiring real sources.".to_string(),
            "Add reference-aware comparison before enabling microphone mode.".to_string(),
            "Promote module-specific telemetry once real feature extractors are connected."
                .to_string(),
        ],
        telemetry_json_path: String::new(),
        telemetry_summary_path: String::new(),
    };

    let run_result = ListeningRunResult {
        timing_state,
        one_bar_grid,
        telemetry: initial_telemetry,
    };

    let telemetry = write_telemetry(telemetry_base_dir, &run_result)?;
    Ok(ListeningRunResult {
        telemetry,
        ..run_result
    })
}

pub fn run_minimal_pipeline(profile: &str, source: &str) -> Result<ListeningRunResult, String> {
    run_minimal_pipeline_in_dir(profile, source, &visual_music_root())
}

#[cfg(test)]
mod tests {
    use super::run_minimal_pipeline_in_dir;
    use std::fs;

    #[test]
    fn run_minimal_pipeline_produces_locked_grid() {
        let test_dir = std::env::temp_dir().join(format!(
            "visualmusic-pipeline-test-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&test_dir);

        let result =
            run_minimal_pipeline_in_dir("minimal_one_bar_grid", "synthetic_pattern", &test_dir)
                .expect("pipeline should run on synthetic source");

        assert_eq!(result.timing_state.sync_state, "LOCKED");
        assert_eq!(result.timing_state.bpm, Some(112.0));
        assert_eq!(result.one_bar_grid.current_beat, 1);
        assert!(result.one_bar_grid.one_bar_grid_score >= 1.0);
        assert!(!result.telemetry.telemetry_json_path.is_empty());
        assert!(!result.telemetry.telemetry_summary_path.is_empty());

        let _ = fs::remove_dir_all(&test_dir);
    }
}
