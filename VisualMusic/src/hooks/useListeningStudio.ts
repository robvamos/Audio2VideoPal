import { startTransition, useEffect, useState } from "react";
import { pipelineEngine } from "../engines/pipelineEngine";
import { BROWSER_PREVIEW_MESSAGE, isDesktopRuntimeAvailable } from "../services/tauriApi";
import type { ListeningFileSourceConfig, ListeningTelemetry, ListeningTimingSnapshot, TimingState } from "../types";
import { deriveAppStateSummary } from "../viewmodels/appState";

interface UseListeningStudioOptions {
  onMessage: (value: string) => void;
}

export function useListeningStudio({ onMessage }: UseListeningStudioOptions) {
  const [audioActive, setAudioActive] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [profile, setProfile] = useState("minimal_one_bar_grid");
  const [source, setSource] = useState("synthetic_pattern");
  const [fileSourceConfig, setFileSourceConfig] = useState<ListeningFileSourceConfig>({
    filePath: "",
    bpmHint: 112,
    meterHint: "4/4",
    durationHintSec: 16,
  });
  const [timingState, setTimingState] = useState<TimingState | null>(null);
  const [telemetry, setTelemetry] = useState<ListeningTelemetry | null>(null);

  function applySnapshot(snapshot: ListeningTimingSnapshot) {
    startTransition(() => {
      setTimingState(snapshot.timingState);
      setTelemetry(snapshot.telemetry);
    });
  }

  function clearSnapshot() {
    applySnapshot({
      timingState: null,
      telemetry: null,
    });
  }

  function updateTelemetry(updatedTelemetry: ListeningTelemetry | null) {
    if (!updatedTelemetry) {
      return;
    }

    startTransition(() => {
      setTelemetry(updatedTelemetry);
    });
  }

  async function runBusyAction(action: () => Promise<void>) {
    try {
      setIsBusy(true);
      await action();
    } finally {
      setIsBusy(false);
    }
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
    await runBusyAction(async () => {
      try {
        if (source === "file") {
          await pipelineEngine.listening.saveFileSourceConfig(fileSourceConfig);
        }
        const result = await pipelineEngine.listening.start(profile, source);
        setAudioActive(true);
        await refreshListeningState();
        onMessage(result);
      } catch (error) {
        onMessage(`Error: ${error}`);
      }
    });
  }

  async function stopListening() {
    await runBusyAction(async () => {
      try {
        const result = await pipelineEngine.listening.stop();
        setAudioActive(false);
        setVideoActive(false);
        clearSnapshot();
        onMessage(result);
      } catch (error) {
        onMessage(`Error: ${error}`);
      }
    });
  }

  async function runListeningTest() {
    await runBusyAction(async () => {
      try {
        if (source === "file") {
          await pipelineEngine.listening.saveFileSourceConfig(fileSourceConfig);
        }
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
      }
    });
  }

  async function toggleVideo() {
    await runBusyAction(async () => {
      try {
        const result = videoActive ? await pipelineEngine.output.stop() : await pipelineEngine.output.start();
        setVideoActive((currentValue) => !currentValue);
        onMessage(result);
      } catch (error) {
        onMessage(`Error: ${error}`);
      }
    });
  }

  async function adjustStructureLearning(action: string) {
    await runBusyAction(async () => {
      try {
        const updatedTelemetry = await pipelineEngine.listening.adjustStructureLearning(action);
        updateTelemetry(updatedTelemetry);
        onMessage(`Structure learning updated: ${action.split("_").join(" ")}`);
      } catch (error) {
        onMessage(`Structure learning update failed: ${error}`);
      }
    });
  }

  async function saveLearningEvaluation(songId: string, rating: string, note: string) {
    await runBusyAction(async () => {
      try {
        const updatedTelemetry = await pipelineEngine.listening.saveLearningEvaluation(songId, rating, note);
        updateTelemetry(updatedTelemetry);
        onMessage(`Evaluation saved: ${rating}`);
      } catch (error) {
        onMessage(`Could not save evaluation: ${error}`);
      }
    });
  }

  async function saveFilterSetupEvaluation(setupId: string, rating: string, note: string) {
    await runBusyAction(async () => {
      try {
        const updatedTelemetry = await pipelineEngine.listening.saveFilterSetupEvaluation(setupId, rating, note);
        updateTelemetry(updatedTelemetry);
        onMessage(`Setup evaluation saved: ${rating}`);
      } catch (error) {
        onMessage(`Could not save setup evaluation: ${error}`);
      }
    });
  }

  useEffect(() => {
    if (!isDesktopRuntimeAvailable()) {
      onMessage(BROWSER_PREVIEW_MESSAGE);
    }
    void pipelineEngine.listening.loadFileSourceConfig().then(setFileSourceConfig);
    refreshListeningState();
  }, []);

  const appState = deriveAppStateSummary({
    audioActive,
    videoActive,
    isBusy,
    telemetry,
    timingState,
  });

  return {
    audioActive,
    appState,
    videoActive,
    isBusy,
    fileSourceConfig,
    profile,
    source,
    timingState,
    telemetry,
    setProfile,
    setSource,
    setFileSourceConfig,
    refreshListeningState,
    startListening,
    stopListening,
    runListeningTest,
    toggleVideo,
    adjustStructureLearning,
    saveLearningEvaluation,
    saveFilterSetupEvaluation,
  };
}
