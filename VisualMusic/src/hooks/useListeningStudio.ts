import { startTransition, useEffect, useState } from "react";
import { pipelineEngine } from "../engines/pipelineEngine";
import { BROWSER_PREVIEW_MESSAGE, isDesktopRuntimeAvailable } from "../services/tauriApi";
import type { ListeningTelemetry, ListeningTimingSnapshot, TimingState } from "../types";

interface UseListeningStudioOptions {
  onMessage: (value: string) => void;
}

export function useListeningStudio({ onMessage }: UseListeningStudioOptions) {
  const [audioActive, setAudioActive] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [profile, setProfile] = useState("minimal_one_bar_grid");
  const [source, setSource] = useState("synthetic_pattern");
  const [timingState, setTimingState] = useState<TimingState | null>(null);
  const [telemetry, setTelemetry] = useState<ListeningTelemetry | null>(null);

  function applySnapshot(snapshot: ListeningTimingSnapshot) {
    startTransition(() => {
      setTimingState(snapshot.timingState);
      setTelemetry(snapshot.telemetry);
    });
  }

  async function refreshListeningState() {
    try {
      const [latestTimingState, latestTelemetry] = await Promise.all([
        pipelineEngine.listening.getLatestTimingState(),
        pipelineEngine.listening.getLatestTelemetry(),
      ]);
      applySnapshot({
        timingState: latestTimingState,
        telemetry: latestTelemetry,
      });
    } catch (error) {
      onMessage(`Could not refresh listening state: ${error}`);
    }
  }

  async function startListening() {
    try {
      setIsBusy(true);
      const result = await pipelineEngine.listening.start(profile, source);
      setAudioActive(true);
      await refreshListeningState();
      onMessage(result);
    } catch (error) {
      onMessage(`Error: ${error}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function stopListening() {
    try {
      setIsBusy(true);
      const result = await pipelineEngine.listening.stop();
      setAudioActive(false);
      onMessage(result);
    } catch (error) {
      onMessage(`Error: ${error}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function runListeningTest() {
    try {
      setIsBusy(true);
      const result = await pipelineEngine.listening.runTest(profile, source);
      setAudioActive(true);
      applySnapshot({
        timingState: result.timing_state,
        telemetry: result.telemetry,
      });
      onMessage(
        `Listening test completed: ${result.telemetry.fused_bpm.toFixed(1)} BPM, ${result.telemetry.sync_state}, grid ${result.one_bar_grid.one_bar_grid_score.toFixed(2)}.`,
      );
    } catch (error) {
      onMessage(`Listening test failed: ${error}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function toggleVideo() {
    try {
      setIsBusy(true);
      const result = videoActive ? await pipelineEngine.output.stop() : await pipelineEngine.output.start();
      setVideoActive(!videoActive);
      onMessage(result);
    } catch (error) {
      onMessage(`Error: ${error}`);
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    if (!isDesktopRuntimeAvailable()) {
      onMessage(BROWSER_PREVIEW_MESSAGE);
    }
    refreshListeningState();
  }, []);

  return {
    audioActive,
    videoActive,
    isBusy,
    profile,
    source,
    timingState,
    telemetry,
    setProfile,
    setSource,
    refreshListeningState,
    startListening,
    stopListening,
    runListeningTest,
    toggleVideo,
  };
}
