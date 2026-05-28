import { invoke } from "@tauri-apps/api/core";
import type {
  ListeningRunResult,
  ListeningTelemetry,
  Plugin,
  ScanDetails,
  TimingState,
} from "../types";

export async function initDb(): Promise<string> {
  return await invoke<string>("init_db");
}

export async function detectFfmpeg(): Promise<string> {
  return await invoke<string>("detect_ffmpeg");
}

export async function batchRenderTest(): Promise<string> {
  return await invoke<string>("batch_render_test");
}

export async function scanPlugins(): Promise<string> {
  return await invoke<string>("scan_plugins");
}

export async function scanPluginsInDirectory(directoryPath: string): Promise<string> {
  return await invoke<string>("scan_plugins_in_directory", { directoryPath });
}

export async function loadPlugins(): Promise<Plugin[]> {
  const result = await invoke<string>("get_plugins_list");
  return JSON.parse(result);
}

export async function deepScanPlugin(filePath: string): Promise<string> {
  return await invoke<string>("deep_scan_plugin", { filePath });
}

export async function getPluginDeepScan(fileId: number): Promise<ScanDetails> {
  const result = await invoke<string>("get_plugin_deep_scan", { fileId });
  return JSON.parse(result);
}

export async function startAudioStream(): Promise<string> {
  return await invoke<string>("start_audio_stream");
}

export async function stopAudioStream(): Promise<string> {
  return await invoke<string>("stop_audio_stream");
}

export async function startListeningPipeline(profile: string, source: string): Promise<string> {
  return await invoke<string>("start_listening_pipeline", { profile, source });
}

export async function stopListeningPipeline(): Promise<string> {
  return await invoke<string>("stop_listening_pipeline");
}

export async function runListeningTest(profile: string, source: string): Promise<ListeningRunResult> {
  const result = await invoke<string>("run_listening_test", { profile, source });
  return JSON.parse(result);
}

export async function getLatestTimingState(): Promise<TimingState | null> {
  const result = await invoke<string>("get_latest_timing_state");
  return JSON.parse(result);
}

export async function getLatestTelemetry(): Promise<ListeningTelemetry | null> {
  const result = await invoke<string>("get_latest_telemetry");
  return JSON.parse(result);
}

export async function startVideoRender(): Promise<string> {
  return await invoke<string>("start_video_render");
}

export async function stopVideoRender(): Promise<string> {
  return await invoke<string>("stop_video_render");
}
