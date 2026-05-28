import { invoke } from "@tauri-apps/api/core";
import type {
  ListeningRunResult,
  ListeningTelemetry,
  Plugin,
  ScanDetails,
  TimingState,
} from "../types";

const BROWSER_PREVIEW_MESSAGE =
  "Browser preview mode: desktop commands become available when Visual Music runs inside the Tauri shell.";

let previewTimingState: TimingState | null = null;
let previewTelemetry: ListeningTelemetry | null = null;

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
    wiring: {
      profile,
      active_modules: [
        "synthetic_pattern",
        "normalizer",
        "onset_strength",
        "low_band_pulse",
        "tempo_autocorrelation",
        "weighted_tempo_fusion",
        "beat_grid_tracker",
        "simple_downbeat_scorer",
        "one_bar_grid_evaluator",
        "telemetry_writer",
      ],
      disabled_modules: ["file_source", "internal_player", "microphone_capture", "visual_trigger"],
      module_edges: [
        ["synthetic_pattern", "normalizer"],
        ["normalizer", "onset_strength"],
        ["normalizer", "low_band_pulse"],
        ["onset_strength", "tempo_autocorrelation"],
        ["low_band_pulse", "weighted_tempo_fusion"],
        ["tempo_autocorrelation", "weighted_tempo_fusion"],
        ["weighted_tempo_fusion", "beat_grid_tracker"],
        ["beat_grid_tracker", "simple_downbeat_scorer"],
        ["simple_downbeat_scorer", "one_bar_grid_evaluator"],
        ["one_bar_grid_evaluator", "telemetry_writer"],
      ],
    },
    recommendations: [
      "Preview mode is using a deterministic timing sample so the UI can be checked outside the desktop shell.",
      "Launch the Tauri app to replace preview values with real listening telemetry and artifact paths.",
      "Keep file and microphone sources disabled until the real timing lock is consistently visible.",
    ],
    telemetry_json_path: "runtime/telemetry/browser-preview.telemetry.json",
    telemetry_summary_path: "runtime/telemetry/browser-preview.summary.md",
  };

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

export { BROWSER_PREVIEW_MESSAGE, isDesktopRuntimeAvailable };

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
    async () => JSON.stringify(previewTimingState),
  );
  return JSON.parse(result);
}

export async function getLatestTelemetry(): Promise<ListeningTelemetry | null> {
  const result = await invokeDesktop<string>(
    "get_latest_telemetry",
    undefined,
    async () => JSON.stringify(previewTelemetry),
  );
  return JSON.parse(result);
}

export async function startVideoRender(): Promise<string> {
  return await invokeDesktop<string>("start_video_render", undefined, async () => BROWSER_PREVIEW_MESSAGE);
}

export async function stopVideoRender(): Promise<string> {
  return await invokeDesktop<string>("stop_video_render", undefined, async () => BROWSER_PREVIEW_MESSAGE);
}
