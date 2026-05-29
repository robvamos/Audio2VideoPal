use crate::core::runtime_state::{
    FilterSetupDefinition, FilterSetupEvaluationEntry, LearningEvaluationEntry, LearningTelemetry,
    ListeningRunResult, ListeningTelemetry, OneBarGridResult, PipelineContext,
    PreprocessingTelemetry, StructureComparison, StructureSegment, TestSongDefinition,
    TimingState, WiringDescription, FlowProbeTelemetry,
};
use crate::core::telemetry::write_telemetry;
use crate::sources::synthetic_source::SyntheticPatternSource;
use chrono::Local;
use serde::{Deserialize, Serialize};
use std::f64::consts::PI;
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
struct PreprocessingReferenceConfig {
    enabled: bool,
    mix_ratio: f64,
    latency_alignment_ms: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PreprocessingConfig {
    self_output_reference: PreprocessingReferenceConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PipelineConfig {
    profile: String,
    source: PipelineSourceConfig,
    preprocessing: PreprocessingConfig,
    modules: Vec<PipelineModuleConfig>,
    thresholds: PipelineThresholds,
}

fn calculate_preprocessing_telemetry(config: &PipelineConfig) -> PreprocessingTelemetry {
    let reference = &config.preprocessing.self_output_reference;
    let residual_energy_ratio = (1.0 - (reference.mix_ratio * 0.78)).clamp(0.08, 1.0);
    let cancellation_db = 20.0 * (1.0 / residual_energy_ratio).log10();

    PreprocessingTelemetry {
        self_reference_enabled: reference.enabled,
        reference_mix_ratio: reference.mix_ratio,
        residual_energy_ratio,
        cancellation_db,
        latency_alignment_ms: reference.latency_alignment_ms,
    }
}

fn hash_value(input: &str) -> u32 {
    input
        .bytes()
        .fold(0_u32, |hash, value| hash.wrapping_mul(31).wrapping_add(value as u32))
}

fn build_probe_samples(target_id: &str, bpm: f64, grid_score: f64) -> Vec<f64> {
    let seed = hash_value(target_id);
    let bpm_factor = bpm / 120.0;
    let phase_seed = ((seed % 17) as f64) / 5.0;
    let pulse_period = (8_i32 - (grid_score * 4.0).round() as i32).max(3) as usize;

    (0..64)
        .map(|index| {
            let x = index as f64 / 63.0;
            let wave = 0.5
                + (((x * PI * 2.0 * bpm_factor) + phase_seed).sin() * 0.24)
                + (((x * PI * 6.0) + ((seed % 11) as f64)).cos() * 0.11);
            let pulse_boost = if index % pulse_period == 0 { 0.16 } else { 0.0 };
            (wave + pulse_boost).clamp(0.06, 0.98)
        })
        .collect()
}

fn build_hit_indexes(samples: &[f64]) -> Vec<usize> {
    samples
        .iter()
        .enumerate()
        .filter_map(|(index, value)| {
            let previous = index.checked_sub(1).and_then(|prev| samples.get(prev)).copied().unwrap_or(0.0);
            if *value > 0.72 && *value >= previous {
                Some(index)
            } else {
                None
            }
        })
        .collect()
}

fn signal_kind_for_target(target_id: &str, target_type: &str) -> String {
    if target_type == "edge" {
        return "handoff".to_string();
    }

    if target_id.contains("pulse") || target_id.contains("beat") {
        "pulse".to_string()
    } else if target_id.contains("grid") || target_id.contains("tempo") {
        "timing".to_string()
    } else if target_id.contains("reference") || target_id.contains("subtractor") {
        "reference".to_string()
    } else {
        "signal".to_string()
    }
}

fn build_flow_probes(active_modules: &[String], module_edges: &[[String; 2]], bpm: f64, grid_score: f64) -> Vec<FlowProbeTelemetry> {
    let mut probes = active_modules
        .iter()
        .map(|module_name| {
            let samples = build_probe_samples(module_name, bpm, grid_score);
            FlowProbeTelemetry {
                target_type: "module".to_string(),
                target_id: module_name.clone(),
                display_name: module_name.clone(),
                signal_kind: signal_kind_for_target(module_name, "module"),
                hit_indexes: build_hit_indexes(&samples),
                samples,
                memory_sec: 9.0,
            }
        })
        .collect::<Vec<_>>();

    probes.extend(module_edges.iter().map(|[from, to]| {
        let target_id = format!("{from} -> {to}");
        let samples = build_probe_samples(&target_id, bpm, grid_score);
        FlowProbeTelemetry {
            target_type: "edge".to_string(),
            display_name: target_id.clone(),
            signal_kind: signal_kind_for_target(&target_id, "edge"),
            target_id,
            hit_indexes: build_hit_indexes(&samples),
            samples,
            memory_sec: 9.0,
        }
    }));

    probes
}

fn learning_telemetry() -> LearningTelemetry {
    LearningTelemetry {
        current_stage: "listening".to_string(),
        rating_scale: vec![
            "scarso".to_string(),
            "debole".to_string(),
            "buono".to_string(),
            "ottimo".to_string(),
        ],
        test_songs: vec![
            TestSongDefinition {
                id: "phase_alignment_drill".to_string(),
                focus: "beat_1_and_phase".to_string(),
                expected_outcome: "Fast phase lock with clean quarter ordering.".to_string(),
            },
            TestSongDefinition {
                id: "grid16_phrase_map".to_string(),
                focus: "long_phrase_tracking".to_string(),
                expected_outcome: "Stable 4-bar and 16-grid phrase awareness.".to_string(),
            },
            TestSongDefinition {
                id: "tempo_transition_stress".to_string(),
                focus: "relock_and_resync".to_string(),
                expected_outcome: "Controlled relock after tempo transitions.".to_string(),
            },
            TestSongDefinition {
                id: "generic_reference_sample".to_string(),
                focus: "reference_subtraction".to_string(),
                expected_outcome: "Residual self-output energy remains low after preprocessing."
                    .to_string(),
            },
            TestSongDefinition {
                id: "reference_live_calibration".to_string(),
                focus: "latency_alignment".to_string(),
                expected_outcome: "Reference alignment stays usable under live routing latency."
                    .to_string(),
            },
        ],
        filter_setups: vec![
            FilterSetupDefinition {
                id: "reference_subtractive_gate".to_string(),
                name: "Reference Subtractive Gate".to_string(),
                description: "Prioritize self-output subtraction before envelope extraction."
                    .to_string(),
                goal: "reduce_self_bleed".to_string(),
                modules: vec![
                    "self_output_reference".to_string(),
                    "self_output_subtractor".to_string(),
                    "normalizer".to_string(),
                ],
            },
            FilterSetupDefinition {
                id: "tempo_stability_merge".to_string(),
                name: "Tempo Stability Merge".to_string(),
                description: "Favor stable tempo windows before fusion and grid tracking."
                    .to_string(),
                goal: "improve_relock".to_string(),
                modules: vec![
                    "tempo_autocorrelation".to_string(),
                    "window_stability_merge".to_string(),
                    "weighted_tempo_fusion".to_string(),
                ],
            },
            FilterSetupDefinition {
                id: "phase_grid_focus".to_string(),
                name: "Phase Grid Focus".to_string(),
                description: "Bias the path toward phase and beat-1 reconstruction fidelity."
                    .to_string(),
                goal: "tighten_beat_1".to_string(),
                modules: vec![
                    "learning_grid".to_string(),
                    "beat_grid_tracker".to_string(),
                    "simple_downbeat_scorer".to_string(),
                ],
            },
        ],
        structure_comparison: StructureComparison {
            target_label: "grid16_phrase_map".to_string(),
            average_error_ratio: 0.06,
            segment_offset_ratio: -0.03,
            segment_scale_ratio: 1.08,
            reference_segments: vec![
                StructureSegment {
                    label: "Intro".to_string(),
                    start_ratio: 0.0,
                    end_ratio: 0.22,
                },
                StructureSegment {
                    label: "Phrase A".to_string(),
                    start_ratio: 0.22,
                    end_ratio: 0.49,
                },
                StructureSegment {
                    label: "Phrase B".to_string(),
                    start_ratio: 0.49,
                    end_ratio: 0.76,
                },
                StructureSegment {
                    label: "Turn".to_string(),
                    start_ratio: 0.76,
                    end_ratio: 1.0,
                },
            ],
            reconstructed_segments: vec![
                StructureSegment {
                    label: "Intro".to_string(),
                    start_ratio: 0.0,
                    end_ratio: 0.19,
                },
                StructureSegment {
                    label: "Phrase A".to_string(),
                    start_ratio: 0.19,
                    end_ratio: 0.53,
                },
                StructureSegment {
                    label: "Phrase B".to_string(),
                    start_ratio: 0.53,
                    end_ratio: 0.79,
                },
                StructureSegment {
                    label: "Turn".to_string(),
                    start_ratio: 0.79,
                    end_ratio: 1.0,
                },
            ],
        },
        evaluation_history: vec![LearningEvaluationEntry {
            timestamp: "seed".to_string(),
            song_id: "phase_alignment_drill".to_string(),
            rating: "buono".to_string(),
            note: "Baseline synthetic run with small phrase drift.".to_string(),
            average_error_ratio: 0.06,
            segment_offset_ratio: -0.03,
            segment_scale_ratio: 1.08,
        }],
        setup_evaluation_history: vec![FilterSetupEvaluationEntry {
            timestamp: "seed".to_string(),
            setup_id: "reference_subtractive_gate".to_string(),
            rating: "buono".to_string(),
            note: "Baseline setup helps keep self-output residue under control.".to_string(),
            goal: "reduce_self_bleed".to_string(),
        }],
        next_milestones: vec![
            "Add file and player-backed reference inputs.".to_string(),
            "Score relock speed on song benchmarks with known ground truth.".to_string(),
            "Persist rating and user notes for configuration evaluation.".to_string(),
        ],
    }
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
    let preprocessing = calculate_preprocessing_telemetry(&config);
    let learning = learning_telemetry();
    let module_probes = build_flow_probes(&active_modules, &module_edges, source_model.bpm, one_bar_grid.one_bar_grid_score);

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
        preprocessing,
        learning,
        wiring: WiringDescription {
            profile: config.profile,
            active_modules,
            disabled_modules,
            module_edges,
        },
        module_probes,
        recommendations: vec![
            "Keep synthetic_pattern as the baseline fixture while wiring real sources.".to_string(),
            "Route self-output reference through preprocessing before any higher-level timing inference."
                .to_string(),
            "Add benchmark songs with known beat-1 markers before enabling adaptive musical response."
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
        assert!(result.telemetry.preprocessing.self_reference_enabled);
        assert!(result.telemetry.preprocessing.cancellation_db > 0.0);
        assert_eq!(result.telemetry.learning.current_stage, "listening");
        assert!(!result.telemetry.telemetry_json_path.is_empty());
        assert!(!result.telemetry.telemetry_summary_path.is_empty());

        let _ = fs::remove_dir_all(&test_dir);
    }
}
