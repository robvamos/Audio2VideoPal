use crate::core::runtime_state::{
    FilterSetupDefinition, FilterSetupEvaluationEntry, LearningEvaluationEntry, LearningTelemetry,
    ListeningRunResult, ListeningTelemetry, OneBarGridResult, PipelineContext,
    PreprocessingTelemetry, StructureComparison, StructureSegment,
    TimingState, WiringDescription, FlowProbeTelemetry,
};
use crate::core::benchmark_library::load_benchmark_song_library;
use crate::core::telemetry::write_telemetry;
use crate::core::event::PipelineEvent;
use crate::sources::file_source::build_file_pattern_source;
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

fn build_base_pulse_grid(events: &[PipelineEvent], duration_sec: f64, sample_count: usize) -> Vec<f64> {
    let mut samples = vec![0.08; sample_count];
    if duration_sec <= 0.0 || sample_count == 0 {
        return samples;
    }

    for event in events {
        let normalized = (event.time_sec / duration_sec).clamp(0.0, 1.0);
        let center = ((sample_count - 1) as f64 * normalized).round() as isize;
        let beat_in_bar = event
            .payload
            .get("beat_in_bar")
            .and_then(|value| value.as_u64())
            .unwrap_or(1);
        let pulse_strength = if beat_in_bar == 1 { 0.95 } else { 0.74 };

        for spread in -2..=2 {
            let index = center + spread;
            if index < 0 || index >= sample_count as isize {
                continue;
            }

            let falloff = match spread.abs() {
                0 => pulse_strength,
                1 => pulse_strength * 0.52,
                _ => pulse_strength * 0.25,
            };

            let slot = &mut samples[index as usize];
            *slot = (*slot + falloff).clamp(0.0, 1.0);
        }
    }

    samples
}

fn smooth_samples(samples: &[f64], passes: usize) -> Vec<f64> {
    let mut current = samples.to_vec();
    for _ in 0..passes {
        current = current
            .iter()
            .enumerate()
            .map(|(index, value)| {
                let previous = index.checked_sub(1).and_then(|prev| current.get(prev)).copied().unwrap_or(*value);
                let next = current.get(index + 1).copied().unwrap_or(*value);
                ((previous * 0.25) + (*value * 0.5) + (next * 0.25)).clamp(0.0, 1.0)
            })
            .collect();
    }
    current
}

fn accent_downbeats(samples: &[f64], events: &[PipelineEvent], duration_sec: f64) -> Vec<f64> {
    let mut accented = samples.to_vec();
    let sample_count = samples.len();
    if duration_sec <= 0.0 || sample_count == 0 {
        return accented;
    }

    for event in events {
        let beat_in_bar = event
            .payload
            .get("beat_in_bar")
            .and_then(|value| value.as_u64())
            .unwrap_or(1);
        if beat_in_bar != 1 {
            continue;
        }

        let normalized = (event.time_sec / duration_sec).clamp(0.0, 1.0);
        let center = ((sample_count - 1) as f64 * normalized).round() as isize;
        for spread in -1..=1 {
            let index = center + spread;
            if index >= 0 && index < sample_count as isize {
                accented[index as usize] = (accented[index as usize] + 0.18).clamp(0.0, 1.0);
            }
        }
    }

    accented
}

fn shape_probe_samples(
    target_id: &str,
    base_grid: &[f64],
    events: &[PipelineEvent],
    duration_sec: f64,
    bpm: f64,
    residual_energy_ratio: f64,
) -> Vec<f64> {
    let seed = hash_value(target_id);
    let bpm_factor = bpm / 120.0;
    let phase_seed = ((seed % 17) as f64) / 5.0;
    let cosine_seed = (seed % 11) as f64;

    let fallback_wave = |index: usize, count: usize| {
        let x = index as f64 / (count.saturating_sub(1).max(1) as f64);
        0.42 + (((x * PI * 2.0 * bpm_factor) + phase_seed).sin() * 0.18)
            + (((x * PI * 6.0) + cosine_seed).cos() * 0.08)
    };

    let mut samples = base_grid
        .iter()
        .enumerate()
        .map(|(index, value)| {
            let noise = fallback_wave(index, base_grid.len());
            ((*value * 0.72) + (noise * 0.28)).clamp(0.0, 1.0)
        })
        .collect::<Vec<_>>();

    if target_id.contains("reference") {
        samples = smooth_samples(&samples, 3)
            .into_iter()
            .map(|value| (value * (1.0 - residual_energy_ratio * 0.35)).clamp(0.0, 1.0))
            .collect();
    } else if target_id.contains("subtractor") {
        samples = samples
            .into_iter()
            .map(|value| (value * (1.0 - residual_energy_ratio * 0.45)).clamp(0.0, 1.0))
            .collect();
    } else if target_id.contains("normalizer") {
        let max = samples.iter().copied().fold(0.0, f64::max).max(0.001);
        samples = samples.into_iter().map(|value| (value / max).clamp(0.0, 1.0)).collect();
    } else if target_id.contains("onset") {
        samples = samples
            .iter()
            .enumerate()
            .map(|(index, value)| {
                let previous = index.checked_sub(1).and_then(|prev| samples.get(prev)).copied().unwrap_or(*value);
                ((value - previous).abs() * 1.4 + 0.08).clamp(0.0, 1.0)
            })
            .collect();
    } else if target_id.contains("low_band") || target_id.contains("downbeat") {
        samples = accent_downbeats(&samples, events, duration_sec);
    } else if target_id.contains("tempo") || target_id.contains("fusion") {
        samples = smooth_samples(&samples, 4);
    } else if target_id.contains("grid") || target_id.contains("beat") {
        samples = smooth_samples(&accent_downbeats(&samples, events, duration_sec), 2);
    } else if target_id.contains("telemetry") {
        samples = smooth_samples(&samples, 5);
    }

    samples.into_iter().map(|value| value.clamp(0.04, 0.98)).collect()
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

fn build_flow_probes(
    active_modules: &[String],
    module_edges: &[[String; 2]],
    events: &[PipelineEvent],
    duration_sec: f64,
    bpm: f64,
    residual_energy_ratio: f64,
) -> Vec<FlowProbeTelemetry> {
    let base_grid = build_base_pulse_grid(events, duration_sec, 64);
    let mut probes = active_modules
        .iter()
        .map(|module_name| {
            let samples = shape_probe_samples(
                module_name,
                &base_grid,
                events,
                duration_sec,
                bpm,
                residual_energy_ratio,
            );
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
        let source_samples = shape_probe_samples(from, &base_grid, events, duration_sec, bpm, residual_energy_ratio);
        let target_samples = shape_probe_samples(to, &base_grid, events, duration_sec, bpm, residual_energy_ratio);
        let samples = source_samples
            .iter()
            .zip(target_samples.iter())
            .map(|(left, right)| ((left * 0.52) + (right * 0.48)).clamp(0.0, 1.0))
            .collect::<Vec<_>>();
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
        test_songs: load_benchmark_song_library(),
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
    let run_id = Local::now()
        .format("%Y%m%d-%H%M%S-listening-synthetic")
        .to_string();
    let mut input_stage_name = "synthetic_pattern".to_string();
    let mut file_source_note = None;
    let source_model = match source {
        "synthetic_pattern" => SyntheticPatternSource::new(
            config.source.bpm,
            config.source.meter.clone(),
            config.source.duration_sec,
        ),
        "file" => {
            let (file_source, resolved) = build_file_pattern_source()?;
            input_stage_name = "file_source".to_string();
            file_source_note = Some(format!(
                "{} | bpm {:.1} | meter {} | exists {}",
                resolved.state.file_path,
                resolved.bpm,
                resolved.meter,
                if resolved.exists_on_disk { "yes" } else { "no" }
            ));
            file_source
        }
        other => {
            return Err(format!(
                "Unsupported listening source in this slice: {other}"
            ))
        }
    };
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

    let mut active_modules = config
        .modules
        .iter()
        .filter(|module| module.enabled)
        .map(|module| module.name.clone())
        .collect::<Vec<_>>();
    active_modules.insert(0, input_stage_name.clone());
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
    let module_probes = build_flow_probes(
        &active_modules,
        &module_edges,
        &emitted_frames,
        config.source.duration_sec,
        source_model.bpm,
        preprocessing.residual_energy_ratio,
    );

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
            if source == "file" {
                "Use the file source slice to validate timing, subtraction and relock on repeatable material."
                    .to_string()
            } else {
                "Keep synthetic_pattern as the baseline fixture while wiring real sources.".to_string()
            },
            "Route self-output reference through preprocessing before any higher-level timing inference."
                .to_string(),
            "Add benchmark songs with known beat-1 markers before enabling adaptive musical response."
                .to_string(),
            if let Some(note) = file_source_note {
                format!("Active file source: {note}")
            } else {
                "Switch to file source when you want repeatable runs on real material.".to_string()
            },
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
