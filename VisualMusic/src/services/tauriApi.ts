import { invoke } from "@tauri-apps/api/core";
import type {
  BenchmarkSweepReportSummary,
  FlowProbeTelemetry,
  TestSongDefinition,
  ListeningFileSourceConfig,
  ListeningRunResult,
  ListeningTelemetry,
  MapPuzzleViewState,
  Plugin,
  ScanDetails,
  TimingState,
} from "../types";

const BROWSER_PREVIEW_MESSAGE =
  "Browser preview mode: desktop commands become available when Visual Music runs inside the Tauri shell.";

let previewTimingState: TimingState | null = null;
let previewTelemetry: ListeningTelemetry | null = null;
let previewBenchmarkSweepReports: BenchmarkSweepReportSummary[] | null = null;
const MAP_PUZZLE_STATE_KEY = "visualmusic.mapPuzzleState";
const FILE_SOURCE_STATE_KEY = "visualmusic.fileSourceState";

const DEFAULT_MAP_PUZZLE_STATE: MapPuzzleViewState = {
  selectedSongId: "grid16_phrase_map",
  selectedSetupId: "phase_grid_focus",
  edgeFilter: "all",
  compareMode: "split",
  diagnosticsLens: "timing",
  memoryNote: "",
  analyzerTargetType: "module",
  analyzerTargetId: "tempo_autocorrelation",
  analyzerWindow: "medium",
};

const DEFAULT_FILE_SOURCE_STATE: ListeningFileSourceConfig = {
  filePath: "",
  bpmHint: 112,
  meterHint: "4/4",
  durationHintSec: 16,
};

function isDesktopRuntimeAvailable(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const runtimeWindow = window as Window & {
    __TAURI_INTERNALS__?: {
      invoke?: unknown;
    };
  };

  return typeof runtimeWindow.__TAURI_INTERNALS__?.invoke === "function";
}

async function invokeDesktop<T>(
  command: string,
  args?: Record<string, unknown>,
  fallback?: () => T | Promise<T>,
): Promise<T> {
  if (!isDesktopRuntimeAvailable()) {
    if (fallback) {
      return await fallback();
    }
    throw new Error(BROWSER_PREVIEW_MESSAGE);
  }

  return await invoke<T>(command, args);
}

function createPreviewRunResult(profile: string, source: string): ListeningRunResult {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const currentOffset = previewTelemetry?.learning.structure_comparison.segment_offset_ratio ?? -0.03;
  const currentScale = previewTelemetry?.learning.structure_comparison.segment_scale_ratio ?? 1.08;

  previewTimingState = {
    sync_state: "preview_locked",
    bpm: 112,
    meter: "4/4",
    bar: 12,
    beat_in_bar: 1,
    next_beat_sec: 0.54,
    next_downbeat_sec: 2.14,
    tempo_confidence: 0.96,
    phase_confidence: 0.92,
    downbeat_confidence: 0.89,
  };

  previewTelemetry = {
    run_id: `preview-${timestamp}`,
    profile,
    source,
    status: "preview_complete",
    fused_bpm: 112,
    bpm_confidence: 0.96,
    sync_state: "preview_locked",
    downbeat_confidence: 0.89,
    one_bar_grid_score: 0.93,
    preprocessing: {
      self_reference_enabled: true,
      reference_mix_ratio: 0.72,
      residual_energy_ratio: 0.44,
      cancellation_db: 7.1,
      latency_alignment_ms: 12,
    },
    learning: {
      current_stage: "listening",
      rating_scale: ["scarso", "debole", "buono", "ottimo"],
      test_songs: [
        {
          id: "phase_alignment_drill",
          focus: "beat_1_and_phase",
          expected_outcome: "Fast phase lock with clean quarter ordering across short pauses and return pivots.",
          file_path: "benchmarks/audio/phase_alignment_drill.wav",
          bpm_hint: 96,
          meter_hint: "4/4",
          duration_hint_sec: 60.655,
          notes: "24 bars, 3 pauses, tempo zones 96 -> 100 -> 96 -> 92 BPM.",
        },
        {
          id: "grid16_phrase_map",
          focus: "long_phrase_tracking",
          expected_outcome: "Stable 4-bar and 16-grid phrase awareness across phrase zones and a closing slowdown.",
          file_path: "benchmarks/audio/grid16_phrase_map.wav",
          bpm_hint: 108,
          meter_hint: "4/4",
          duration_hint_sec: 62.729,
          notes: "28 bars, 3 pauses, tempo zones 108 -> 112 -> 108 -> 104 BPM.",
        },
        {
          id: "tempo_transition_stress",
          focus: "relock_and_resync",
          expected_outcome: "Controlled relock after multiple tempo transitions and explicit silent breaks.",
          file_path: "benchmarks/audio/tempo_transition_stress.wav",
          bpm_hint: 104,
          meter_hint: "4/4",
          duration_hint_sec: 52.916,
          notes: "24 bars, 4 pauses, tempo zones 104 -> 118 -> 132 -> 96 -> 124 BPM.",
        },
        {
          id: "generic_reference_sample",
          focus: "reference_subtraction",
          expected_outcome: "Residual self-output energy remains low and pauses do not create false pulses.",
          file_path: "benchmarks/audio/generic_reference_sample.wav",
          bpm_hint: 110,
          meter_hint: "4/4",
          duration_hint_sec: 49.093,
          notes: "22 bars, 3 pauses, tempo zones 110 -> 114 -> 110 -> 106 BPM.",
        },
        {
          id: "reference_live_calibration",
          focus: "latency_alignment",
          expected_outcome: "Reference alignment stays usable through returns, pauses and small calibration tempo offsets.",
          file_path: "benchmarks/audio/reference_live_calibration.wav",
          bpm_hint: 120,
          meter_hint: "4/4",
          duration_hint_sec: 40.918,
          notes: "20 bars, 3 pauses, tempo zones 120 -> 124 -> 120 -> 116 BPM.",
        },
      ],
      filter_setups: [
        {
          id: "reference_subtractive_gate",
          name: "Reference Subtractive Gate",
          description: "Prioritize self-output subtraction before envelope extraction.",
          goal: "reduce_self_bleed",
          modules: ["self_output_reference", "self_output_subtractor", "normalizer"],
        },
        {
          id: "tempo_stability_merge",
          name: "Tempo Stability Merge",
          description: "Favor stable tempo windows before fusion and grid tracking.",
          goal: "improve_relock",
          modules: ["tempo_autocorrelation", "window_stability_merge", "weighted_tempo_fusion"],
        },
        {
          id: "phase_grid_focus",
          name: "Phase Grid Focus",
          description: "Bias the path toward phase and beat-1 reconstruction fidelity.",
          goal: "tighten_beat_1",
          modules: ["learning_grid", "beat_grid_tracker", "simple_downbeat_scorer"],
        },
      ],
      structure_comparison: {
        target_label: "grid16_phrase_map",
        average_error_ratio: 0.06,
        segment_offset_ratio: currentOffset,
        segment_scale_ratio: currentScale,
        reference_segments: [
          { label: "Intro", start_ratio: 0, end_ratio: 0.22 },
          { label: "Phrase A", start_ratio: 0.22, end_ratio: 0.49 },
          { label: "Phrase B", start_ratio: 0.49, end_ratio: 0.76 },
          { label: "Turn", start_ratio: 0.76, end_ratio: 1 },
        ],
        reconstructed_segments: [
          { label: "Intro", start_ratio: 0, end_ratio: 0.19 },
          { label: "Phrase A", start_ratio: 0.19, end_ratio: 0.53 },
          { label: "Phrase B", start_ratio: 0.53, end_ratio: 0.79 },
          { label: "Turn", start_ratio: 0.79, end_ratio: 1 },
        ],
      },
      benchmark_run_history: [
        {
          timestamp: "preview",
          song_id: "grid16_phrase_map",
          profile: profile,
          source: source,
          sync_state: "preview_locked",
          fused_bpm: 112,
          bpm_confidence: 0.96,
          downbeat_confidence: 0.89,
          one_bar_grid_score: 0.93,
          residual_energy_ratio: 0.44,
          cancellation_db: 7.1,
          file_path: "preview://grid16_phrase_map",
        },
      ],
      evaluation_history: [
        {
          timestamp: "preview",
          song_id: "phase_alignment_drill",
          rating: "buono",
          note: "Preview baseline with visible but contained drift.",
          average_error_ratio: 0.06,
          segment_offset_ratio: -0.03,
          segment_scale_ratio: 1.08,
        },
      ],
      setup_evaluation_history: [
        {
          timestamp: "preview",
          setup_id: "reference_subtractive_gate",
          rating: "buono",
          note: "Preview setup reduces self-output bleed without destabilizing lock.",
          goal: "reduce_self_bleed",
        },
      ],
      next_milestones: [
        "Add file and player-backed reference inputs.",
        "Score relock speed on song benchmarks with known ground truth.",
        "Persist rating and user notes for configuration evaluation.",
      ],
    },
    wiring: {
      profile,
      active_modules: [
        "synthetic_pattern",
        "self_output_reference",
        "self_output_subtractor",
        "normalizer",
        "onset_strength",
        "low_band_pulse",
        "tempo_autocorrelation",
        "window_stability_merge",
        "learning_grid",
        "weighted_tempo_fusion",
        "beat_grid_tracker",
        "simple_downbeat_scorer",
        "one_bar_grid_evaluator",
        "telemetry_writer",
      ],
      disabled_modules: ["file_source", "internal_player", "microphone_capture", "visual_trigger"],
      module_edges: [
        ["synthetic_pattern", "self_output_reference"],
        ["self_output_reference", "self_output_subtractor"],
        ["self_output_subtractor", "normalizer"],
        ["normalizer", "onset_strength"],
        ["normalizer", "low_band_pulse"],
        ["onset_strength", "tempo_autocorrelation"],
        ["tempo_autocorrelation", "window_stability_merge"],
        ["low_band_pulse", "learning_grid"],
        ["window_stability_merge", "weighted_tempo_fusion"],
        ["learning_grid", "weighted_tempo_fusion"],
        ["weighted_tempo_fusion", "beat_grid_tracker"],
        ["beat_grid_tracker", "simple_downbeat_scorer"],
        ["simple_downbeat_scorer", "one_bar_grid_evaluator"],
        ["one_bar_grid_evaluator", "telemetry_writer"],
      ],
    },
    module_probes: createPreviewFlowProbes(
      [
        "synthetic_pattern",
        "self_output_reference",
        "self_output_subtractor",
        "normalizer",
        "onset_strength",
        "low_band_pulse",
        "tempo_autocorrelation",
        "window_stability_merge",
        "learning_grid",
        "weighted_tempo_fusion",
        "beat_grid_tracker",
        "simple_downbeat_scorer",
        "one_bar_grid_evaluator",
        "telemetry_writer",
      ],
      [
        ["synthetic_pattern", "self_output_reference"],
        ["self_output_reference", "self_output_subtractor"],
        ["self_output_subtractor", "normalizer"],
        ["normalizer", "onset_strength"],
        ["normalizer", "low_band_pulse"],
        ["onset_strength", "tempo_autocorrelation"],
        ["tempo_autocorrelation", "window_stability_merge"],
        ["low_band_pulse", "learning_grid"],
        ["window_stability_merge", "weighted_tempo_fusion"],
        ["learning_grid", "weighted_tempo_fusion"],
        ["weighted_tempo_fusion", "beat_grid_tracker"],
        ["beat_grid_tracker", "simple_downbeat_scorer"],
        ["simple_downbeat_scorer", "one_bar_grid_evaluator"],
        ["one_bar_grid_evaluator", "telemetry_writer"],
      ],
      112,
      0.93,
    ),
    recommendations: [
      "Preview mode is using a deterministic timing sample so the UI can be checked outside the desktop shell.",
      "Launch the Tauri app to replace preview values with real listening telemetry and artifact paths.",
      "Keep file and microphone sources disabled until the real timing lock is consistently visible.",
      "Use benchmark songs with known beat-1 markers before enabling adaptive response stages.",
    ],
    telemetry_json_path: "runtime/telemetry/browser-preview.telemetry.json",
    telemetry_summary_path: "runtime/telemetry/browser-preview.summary.md",
  };

  rebuildPreviewStructureComparison(previewTelemetry);

  return {
    timing_state: previewTimingState,
    one_bar_grid: {
      beat_labels: [1, 2, 3, 4],
      current_beat: 1,
      one_bar_grid_score: 0.93,
      bpm_confidence: 0.96,
      downbeat_error_ms: 14,
    },
    telemetry: previewTelemetry,
  };
}

function createPreviewFlowProbes(
  activeModules: string[],
  moduleEdges: [string, string][],
  bpm: number,
  gridScore: number,
): FlowProbeTelemetry[] {
  function hashValue(input: string) {
    let hash = 0;
    for (let index = 0; index < input.length; index += 1) {
      hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
    }
    return hash;
  }

  function buildSamples(targetId: string) {
    const seed = hashValue(targetId);
    const bpmFactor = bpm / 120;
    const pulsePeriod = Math.max(3, Math.round(8 - gridScore * 4));

    return Array.from({ length: 64 }, (_, index) => {
      const x = index / 63;
      const wave =
        0.5 +
        Math.sin((x * Math.PI * 2 * bpmFactor) + ((seed % 17) / 5)) * 0.24 +
        Math.cos((x * Math.PI * 6) + (seed % 11)) * 0.11;
      const pulseBoost = index % pulsePeriod === 0 ? 0.16 : 0;
      return Math.max(0.06, Math.min(0.98, wave + pulseBoost));
    });
  }

  function buildHits(samples: number[]) {
    return samples
      .map((value, index) => ({ value, index }))
      .filter((item, index, items) => item.value > 0.72 && (index === 0 || item.value >= items[index - 1].value))
      .map((item) => item.index);
  }

  function signalKind(targetId: string, targetType: "module" | "edge") {
    if (targetType === "edge") {
      return "handoff";
    }
    if (targetId.includes("pulse") || targetId.includes("beat")) {
      return "pulse";
    }
    if (targetId.includes("grid") || targetId.includes("tempo")) {
      return "timing";
    }
    if (targetId.includes("reference") || targetId.includes("subtractor")) {
      return "reference";
    }
    return "signal";
  }

  const probes: FlowProbeTelemetry[] = activeModules.map((moduleName) => {
    const samples = buildSamples(moduleName);
    return {
      target_type: "module",
      target_id: moduleName,
      display_name: moduleName,
      signal_kind: signalKind(moduleName, "module"),
      samples,
      hit_indexes: buildHits(samples),
      memory_sec: 9,
    } satisfies FlowProbeTelemetry;
  });

  probes.push(
    ...moduleEdges.map(([from, to]) => {
      const targetId = `${from} -> ${to}`;
      const samples = buildSamples(targetId);
      return {
        target_type: "edge",
        target_id: targetId,
        display_name: targetId,
        signal_kind: signalKind(targetId, "edge"),
        samples,
        hit_indexes: buildHits(samples),
        memory_sec: 9,
      } satisfies FlowProbeTelemetry;
    }),
  );

  return probes;
}

function ensurePreviewState(profile = "minimal_one_bar_grid", source = "synthetic_pattern") {
  if (!previewTimingState || !previewTelemetry) {
    createPreviewRunResult(profile, source);
  }
}

function createPreviewBenchmarkSweepReports(): BenchmarkSweepReportSummary[] {
  return [
    {
      report_id: "preview-band-aware-v3",
      generated_at: "2026-05-30T01:58:10",
      analysis_version: "band-aware-v3",
      candidate_count: 22,
      recommended_candidate_id: "blend_hfc_kick_fast_refine_07",
      best_overall_score: 0.874,
      worst_overall_score: 0.731,
      spread_score: 0.143,
      top_candidates: [
        {
          id: "blend_hfc_kick_fast_refine_07",
          plugin_mode: "dual_weighted",
          onset_weight: 0.66,
          low_band_weight: 0.34,
          onset_band_label: "1200-10000 Hz",
          low_band_label: "45-180 Hz",
          onset_profile: "hfc",
          tonality_guard: false,
          overall_score: 0.874,
          robustness_score: 0.812,
          suite_floor: 0.731,
          score_floor: 0.772,
          robust_song_count: 11,
          mean_grid_score: 0.8201,
          mean_downbeat_score: 0.744,
          mean_bpm_error: 0.541,
          mean_pause_score: 1,
          distance_from_best: 0,
          distance_from_worst: 0.143,
          suite_scores: {
            synthetic_deterministic: 0.886,
            public_bpm_loop: 0.781,
            realistic_alignment: 0.731,
          },
          songs: [
            { song_id: "phase_alignment_drill", suite: "synthetic_deterministic", overall_score: 0.9171, grid_score: 0.8292, downbeat_score: 0.812, bar_phase_score: 0.801, mean_bpm_abs_error: 0.27 },
            { song_id: "grid16_phrase_map", suite: "synthetic_deterministic", overall_score: 0.8452, grid_score: 0.8136, downbeat_score: 0.744, bar_phase_score: 0.721, mean_bpm_abs_error: 0.789 },
            { song_id: "level_07_full_song_sections_122_bpm", suite: "realistic_alignment", overall_score: 0.731, grid_score: 0.552, downbeat_score: 0.408, bar_phase_score: 0.296, mean_bpm_abs_error: 1.407 },
          ],
        },
        {
          id: "blend_hfc_kick_fast_refine_04",
          plugin_mode: "dual_weighted",
          onset_weight: 0.7,
          low_band_weight: 0.3,
          onset_band_label: "1200-11000 Hz",
          low_band_label: "45-180 Hz",
          onset_profile: "hfc",
          tonality_guard: false,
          overall_score: 0.874,
          robustness_score: 0.806,
          suite_floor: 0.729,
          score_floor: 0.771,
          robust_song_count: 10,
          mean_grid_score: 0.8201,
          mean_downbeat_score: 0.739,
          mean_bpm_error: 0.541,
          mean_pause_score: 1,
          distance_from_best: 0.0001,
          distance_from_worst: 0.1429,
          suite_scores: {
            synthetic_deterministic: 0.884,
            public_bpm_loop: 0.776,
            realistic_alignment: 0.729,
          },
          songs: [
            { song_id: "phase_alignment_drill", suite: "synthetic_deterministic", overall_score: 0.9207, grid_score: 0.8292, downbeat_score: 0.804, bar_phase_score: 0.792, mean_bpm_abs_error: 0.27 },
            { song_id: "grid16_phrase_map", suite: "synthetic_deterministic", overall_score: 0.8441, grid_score: 0.8136, downbeat_score: 0.741, bar_phase_score: 0.716, mean_bpm_abs_error: 0.789 },
            { song_id: "level_07_full_song_sections_122_bpm", suite: "realistic_alignment", overall_score: 0.729, grid_score: 0.548, downbeat_score: 0.402, bar_phase_score: 0.291, mean_bpm_abs_error: 1.407 },
          ],
        },
        {
          id: "blend_hfc_kick_fast",
          plugin_mode: "dual_weighted",
          onset_weight: 0.7,
          low_band_weight: 0.3,
          onset_band_label: "1200-10000 Hz",
          low_band_label: "45-180 Hz",
          onset_profile: "hfc",
          tonality_guard: false,
          overall_score: 0.8732,
          robustness_score: 0.798,
          suite_floor: 0.722,
          score_floor: 0.768,
          robust_song_count: 10,
          mean_grid_score: 0.8185,
          mean_downbeat_score: 0.731,
          mean_bpm_error: 0.541,
          mean_pause_score: 1,
          distance_from_best: 0.0008,
          distance_from_worst: 0.1422,
          suite_scores: {
            synthetic_deterministic: 0.881,
            public_bpm_loop: 0.772,
            realistic_alignment: 0.722,
          },
          songs: [
            { song_id: "phase_alignment_drill", suite: "synthetic_deterministic", overall_score: 0.9207, grid_score: 0.8292, downbeat_score: 0.798, bar_phase_score: 0.784, mean_bpm_abs_error: 0.27 },
            { song_id: "grid16_phrase_map", suite: "synthetic_deterministic", overall_score: 0.8436, grid_score: 0.8136, downbeat_score: 0.728, bar_phase_score: 0.703, mean_bpm_abs_error: 0.789 },
            { song_id: "level_07_full_song_sections_122_bpm", suite: "realistic_alignment", overall_score: 0.722, grid_score: 0.544, downbeat_score: 0.395, bar_phase_score: 0.284, mean_bpm_abs_error: 1.407 },
          ],
        },
      ],
      bottom_candidates: [
        {
          id: "blend_low_bias_safe",
          plugin_mode: "dual_weighted",
          onset_weight: 0.42,
          low_band_weight: 0.58,
          onset_band_label: "700-6500 Hz",
          low_band_label: "45-140 Hz",
          onset_profile: "flux",
          tonality_guard: true,
          overall_score: 0.731,
          robustness_score: 0.618,
          suite_floor: 0.611,
          score_floor: 0.644,
          robust_song_count: 8,
          mean_grid_score: 0.702,
          mean_downbeat_score: 0.511,
          mean_bpm_error: 1.294,
          mean_pause_score: 0.982,
          distance_from_best: 0.143,
          distance_from_worst: 0,
          suite_scores: {
            synthetic_deterministic: 0.772,
            public_bpm_loop: 0.664,
            realistic_alignment: 0.611,
          },
          songs: [
            { song_id: "phase_alignment_drill", suite: "synthetic_deterministic", overall_score: 0.772, grid_score: 0.711, downbeat_score: 0.541, bar_phase_score: 0.492, mean_bpm_abs_error: 0.99 },
            { song_id: "grid16_phrase_map", suite: "synthetic_deterministic", overall_score: 0.719, grid_score: 0.694, downbeat_score: 0.498, bar_phase_score: 0.451, mean_bpm_abs_error: 1.42 },
            { song_id: "level_07_full_song_sections_122_bpm", suite: "realistic_alignment", overall_score: 0.611, grid_score: 0.463, downbeat_score: 0.281, bar_phase_score: 0.212, mean_bpm_abs_error: 1.47 },
          ],
        },
      ],
    },
  ];
}

function rebuildPreviewStructureComparison(
  telemetry: ListeningTelemetry,
  options?: { offsetDelta?: number; scaleDelta?: number; reset?: boolean },
) {
  const comparison = telemetry.learning.structure_comparison;
  const baseOffset = options?.reset ? -0.03 : comparison.segment_offset_ratio + (options?.offsetDelta ?? 0);
  const baseScale = options?.reset ? 1.08 : comparison.segment_scale_ratio + (options?.scaleDelta ?? 0);

  const rebuiltSegments = comparison.reference_segments.map((segment, index) => {
    const center = (segment.start_ratio + segment.end_ratio) / 2 + baseOffset;
    const width = (segment.end_ratio - segment.start_ratio) * baseScale;
    const start = Math.max(0, Math.min(0.95, center - width / 2));
    const end = Math.max(start + 0.04, Math.min(1, center + width / 2));

    return {
      label: segment.label,
      start_ratio: index === 0 ? 0 : Number(start.toFixed(3)),
      end_ratio: index === comparison.reference_segments.length - 1 ? 1 : Number(end.toFixed(3)),
    };
  });

  const averageErrorRatio =
    rebuiltSegments.reduce((sum, segment, index) => {
      const reference = comparison.reference_segments[index];
      return sum + Math.abs(reference.start_ratio - segment.start_ratio) + Math.abs(reference.end_ratio - segment.end_ratio);
    }, 0) /
    (rebuiltSegments.length * 2);

  telemetry.learning.structure_comparison = {
    ...comparison,
    segment_offset_ratio: Number(baseOffset.toFixed(3)),
    segment_scale_ratio: Number(baseScale.toFixed(3)),
    average_error_ratio: Number(averageErrorRatio.toFixed(3)),
    reconstructed_segments: rebuiltSegments,
  };
}

export { BROWSER_PREVIEW_MESSAGE, isDesktopRuntimeAvailable };

export async function loadMapPuzzleState(): Promise<MapPuzzleViewState> {
  const result = await invokeDesktop<string>(
    "load_map_puzzle_state",
    undefined,
    async () => {
      if (typeof window === "undefined") {
        return JSON.stringify(DEFAULT_MAP_PUZZLE_STATE);
      }

      return window.localStorage.getItem(MAP_PUZZLE_STATE_KEY) ?? JSON.stringify(DEFAULT_MAP_PUZZLE_STATE);
    },
  );

  return {
    ...DEFAULT_MAP_PUZZLE_STATE,
    ...JSON.parse(result),
  };
}

export async function saveMapPuzzleState(state: MapPuzzleViewState): Promise<void> {
  await invokeDesktop<string>(
    "save_map_puzzle_state",
    { stateJson: JSON.stringify(state) },
    async () => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(MAP_PUZZLE_STATE_KEY, JSON.stringify(state));
      }
      return "ok";
    },
  );
}

export async function loadFileSourceConfig(): Promise<ListeningFileSourceConfig> {
  const result = await invokeDesktop<string>(
    "load_file_source_config",
    undefined,
    async () => {
      if (typeof window === "undefined") {
        return JSON.stringify(DEFAULT_FILE_SOURCE_STATE);
      }

      return window.localStorage.getItem(FILE_SOURCE_STATE_KEY) ?? JSON.stringify(DEFAULT_FILE_SOURCE_STATE);
    },
  );

  return {
    ...DEFAULT_FILE_SOURCE_STATE,
    ...JSON.parse(result),
  };
}

export async function loadBenchmarkSweepReports(): Promise<BenchmarkSweepReportSummary[]> {
  const result = await invokeDesktop<string>(
    "load_benchmark_sweep_reports",
    undefined,
    async () => {
      if (!previewBenchmarkSweepReports) {
        previewBenchmarkSweepReports = createPreviewBenchmarkSweepReports();
      }
      return JSON.stringify(previewBenchmarkSweepReports);
    },
  );

  return JSON.parse(result) as BenchmarkSweepReportSummary[];
}

export async function saveFileSourceConfig(state: ListeningFileSourceConfig): Promise<void> {
  await invokeDesktop<string>(
    "save_file_source_config",
    { stateJson: JSON.stringify(state) },
    async () => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(FILE_SOURCE_STATE_KEY, JSON.stringify(state));
      }
      return "ok";
    },
  );
}

export async function bindBenchmarkSongFile(
  songId: string,
  filePath: string,
  bpmHint: number | null,
  meterHint: string | null,
  durationHintSec: number | null,
): Promise<TestSongDefinition[]> {
  const result = await invokeDesktop<string>(
    "bind_benchmark_song_file",
    { songId, filePath, bpmHint, meterHint, durationHintSec },
    async () => {
      ensurePreviewState();
      if (!previewTelemetry) {
        return "[]";
      }

      previewTelemetry.learning.test_songs = previewTelemetry.learning.test_songs.map((song) =>
        song.id === songId
          ? {
              ...song,
              file_path: filePath || null,
              bpm_hint: bpmHint,
              meter_hint: meterHint,
              duration_hint_sec: durationHintSec,
            }
          : song,
      );

      return JSON.stringify(previewTelemetry.learning.test_songs);
    },
  );

  return JSON.parse(result);
}

export async function loadBenchmarkSongFileSource(songId: string): Promise<ListeningFileSourceConfig> {
  const result = await invokeDesktop<string>(
    "load_benchmark_song_file_source",
    { songId },
    async () => {
      ensurePreviewState();
      const song = previewTelemetry?.learning.test_songs.find((entry) => entry.id === songId);
      if (!song?.file_path) {
        throw new Error(`Benchmark ${songId} has no bound file yet`);
      }

      return JSON.stringify({
        filePath: song.file_path,
        bpmHint: song.bpm_hint ?? null,
        meterHint: song.meter_hint ?? "4/4",
        durationHintSec: song.duration_hint_sec ?? null,
      } satisfies ListeningFileSourceConfig);
    },
  );

  return {
    ...DEFAULT_FILE_SOURCE_STATE,
    ...JSON.parse(result),
  };
}

export async function runBenchmarkSongTest(profile: string, songId: string): Promise<ListeningRunResult> {
  const result = await invokeDesktop<string>(
    "run_benchmark_song_test",
    { profile, songId },
    async () => {
      const config = await loadBenchmarkSongFileSource(songId);
      await saveFileSourceConfig(config);
      const preview = createPreviewRunResult(profile, "file");
      preview.telemetry.learning.structure_comparison.target_label = songId;
      preview.telemetry.learning.benchmark_run_history = [
        {
          timestamp: new Date().toISOString(),
          song_id: songId,
          profile,
          source: "file",
          sync_state: preview.telemetry.sync_state,
          fused_bpm: preview.telemetry.fused_bpm,
          bpm_confidence: preview.telemetry.bpm_confidence,
          downbeat_confidence: preview.telemetry.downbeat_confidence,
          one_bar_grid_score: preview.telemetry.one_bar_grid_score,
          residual_energy_ratio: preview.telemetry.preprocessing.residual_energy_ratio,
          cancellation_db: preview.telemetry.preprocessing.cancellation_db,
          file_path: config.filePath,
        },
        ...preview.telemetry.learning.benchmark_run_history.filter((entry) => entry.song_id !== songId),
      ].slice(0, 24);
      return JSON.stringify(preview);
    },
  );
  return JSON.parse(result);
}

export async function initDb(): Promise<string> {
  return await invokeDesktop<string>("init_db", undefined, async () => BROWSER_PREVIEW_MESSAGE);
}

export async function detectFfmpeg(): Promise<string> {
  return await invokeDesktop<string>("detect_ffmpeg", undefined, async () => BROWSER_PREVIEW_MESSAGE);
}

export async function batchRenderTest(): Promise<string> {
  return await invokeDesktop<string>("batch_render_test", undefined, async () => BROWSER_PREVIEW_MESSAGE);
}

export async function scanPlugins(): Promise<string> {
  return await invokeDesktop<string>("scan_plugins", undefined, async () => BROWSER_PREVIEW_MESSAGE);
}

export async function scanPluginsInDirectory(directoryPath: string): Promise<string> {
  return await invokeDesktop<string>(
    "scan_plugins_in_directory",
    { directoryPath },
    async () => BROWSER_PREVIEW_MESSAGE,
  );
}

export async function loadPlugins(): Promise<Plugin[]> {
  const result = await invokeDesktop<string>("get_plugins_list", undefined, async () => "[]");
  return JSON.parse(result);
}

export async function deepScanPlugin(filePath: string): Promise<string> {
  return await invokeDesktop<string>("deep_scan_plugin", { filePath }, async () => BROWSER_PREVIEW_MESSAGE);
}

export async function getPluginDeepScan(fileId: number): Promise<ScanDetails> {
  const result = await invokeDesktop<string>(
    "get_plugin_deep_scan",
    { fileId },
    async () =>
      JSON.stringify({
        timestamp: "browser-preview",
        machine_type: "n/a",
        bitness: "n/a",
        is_dll: false,
        raw_scan: { note: BROWSER_PREVIEW_MESSAGE },
      } satisfies ScanDetails),
  );
  return JSON.parse(result);
}

export async function startAudioStream(): Promise<string> {
  return await invokeDesktop<string>("start_audio_stream", undefined, async () => BROWSER_PREVIEW_MESSAGE);
}

export async function stopAudioStream(): Promise<string> {
  return await invokeDesktop<string>("stop_audio_stream", undefined, async () => BROWSER_PREVIEW_MESSAGE);
}

export async function startListeningPipeline(profile: string, source: string): Promise<string> {
  return await invokeDesktop<string>(
    "start_listening_pipeline",
    { profile, source },
    async () => {
      createPreviewRunResult(profile, source);
      return BROWSER_PREVIEW_MESSAGE;
    },
  );
}

export async function stopListeningPipeline(): Promise<string> {
  return await invokeDesktop<string>("stop_listening_pipeline", undefined, async () => {
    previewTimingState = null;
    previewTelemetry = null;
    return BROWSER_PREVIEW_MESSAGE;
  });
}

export async function runListeningTest(profile: string, source: string): Promise<ListeningRunResult> {
  const result = await invokeDesktop<string>(
    "run_listening_test",
    { profile, source },
    async () => JSON.stringify(createPreviewRunResult(profile, source)),
  );
  return JSON.parse(result);
}

export async function getLatestTimingState(): Promise<TimingState | null> {
  const result = await invokeDesktop<string>(
    "get_latest_timing_state",
    undefined,
    async () => {
      ensurePreviewState();
      return JSON.stringify(previewTimingState);
    },
  );
  return JSON.parse(result);
}

export async function getLatestTelemetry(): Promise<ListeningTelemetry | null> {
  const result = await invokeDesktop<string>(
    "get_latest_telemetry",
    undefined,
    async () => {
      ensurePreviewState();
      return JSON.stringify(previewTelemetry);
    },
  );
  return JSON.parse(result);
}

export async function startVideoRender(): Promise<string> {
  return await invokeDesktop<string>("start_video_render", undefined, async () => BROWSER_PREVIEW_MESSAGE);
}

export async function stopVideoRender(): Promise<string> {
  return await invokeDesktop<string>("stop_video_render", undefined, async () => BROWSER_PREVIEW_MESSAGE);
}

export async function adjustStructureLearning(action: string): Promise<ListeningTelemetry | null> {
  const result = await invokeDesktop<string>(
    "adjust_structure_learning",
    { action },
    async () => {
      ensurePreviewState();
      if (!previewTelemetry) {
        return "null";
      }

      switch (action) {
        case "shift_left":
          rebuildPreviewStructureComparison(previewTelemetry, { offsetDelta: -0.01 });
          break;
        case "shift_right":
          rebuildPreviewStructureComparison(previewTelemetry, { offsetDelta: 0.01 });
          break;
        case "compress":
          rebuildPreviewStructureComparison(previewTelemetry, { scaleDelta: -0.04 });
          break;
        case "expand":
          rebuildPreviewStructureComparison(previewTelemetry, { scaleDelta: 0.04 });
          break;
        case "reset":
          rebuildPreviewStructureComparison(previewTelemetry, { reset: true });
          break;
      }

      return JSON.stringify(previewTelemetry);
    },
  );
  return JSON.parse(result);
}

export async function saveLearningEvaluation(songId: string, rating: string, note: string): Promise<ListeningTelemetry | null> {
  const result = await invokeDesktop<string>(
    "save_learning_evaluation",
    { songId, rating, note },
    async () => {
      ensurePreviewState();
      if (!previewTelemetry) {
        return "null";
      }

      previewTelemetry.learning.evaluation_history = [
        {
          timestamp: new Date().toISOString(),
          song_id: songId,
          rating,
          note,
          average_error_ratio: previewTelemetry.learning.structure_comparison.average_error_ratio,
          segment_offset_ratio: previewTelemetry.learning.structure_comparison.segment_offset_ratio,
          segment_scale_ratio: previewTelemetry.learning.structure_comparison.segment_scale_ratio,
        },
        ...previewTelemetry.learning.evaluation_history,
      ].slice(0, 12);

      return JSON.stringify(previewTelemetry);
    },
  );
  return JSON.parse(result);
}

export async function saveFilterSetupEvaluation(setupId: string, rating: string, note: string): Promise<ListeningTelemetry | null> {
  const result = await invokeDesktop<string>(
    "save_filter_setup_evaluation",
    { setupId, rating, note },
    async () => {
      ensurePreviewState();
      if (!previewTelemetry) {
        return "null";
      }

      const setup = previewTelemetry.learning.filter_setups.find((item) => item.id === setupId);
      previewTelemetry.learning.setup_evaluation_history = [
        {
          timestamp: new Date().toISOString(),
          setup_id: setupId,
          rating,
          note,
          goal: setup?.goal ?? "unknown",
        },
        ...previewTelemetry.learning.setup_evaluation_history,
      ].slice(0, 12);

      return JSON.stringify(previewTelemetry);
    },
  );
  return JSON.parse(result);
}
