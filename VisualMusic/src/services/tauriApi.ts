import { invoke } from "@tauri-apps/api/core";
import type {
  FlowProbeTelemetry,
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
          expected_outcome: "Fast phase lock with clean quarter ordering.",
        },
        {
          id: "grid16_phrase_map",
          focus: "long_phrase_tracking",
          expected_outcome: "Stable 4-bar and 16-grid phrase awareness.",
        },
        {
          id: "tempo_transition_stress",
          focus: "relock_and_resync",
          expected_outcome: "Controlled relock after tempo transitions.",
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
