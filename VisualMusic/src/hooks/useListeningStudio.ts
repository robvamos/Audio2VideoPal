import { startTransition, useEffect, useState } from "react";
import { pipelineEngine } from "../engines/pipelineEngine";
import { BROWSER_PREVIEW_MESSAGE, isDesktopRuntimeAvailable } from "../services/tauriApi";
import type {
  BenchmarkSweepReportSummary,
  ListeningFileSourceConfig,
  ListeningTelemetry,
  ListeningTimingSnapshot,
  TestSongDefinition,
  TimingState,
} from "../types";
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
  const [benchmarkSweepReports, setBenchmarkSweepReports] = useState<BenchmarkSweepReportSummary[]>([]);

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

  async function syncFileSourceIfNeeded() {
    if (source !== "file") {
      return;
    }
    await pipelineEngine.listening.saveFileSourceConfig(fileSourceConfig);
  }

  function mergeLearningSongsIntoTelemetry(songs: TestSongDefinition[]) {
    startTransition(() => {
      setTelemetry((current) =>
        current
          ? {
              ...current,
              learning: {
                ...current.learning,
                test_songs: songs,
              },
            }
          : current,
      );
    });
  }

  function toFileSourceConfig(song: TestSongDefinition): ListeningFileSourceConfig {
    return {
      filePath: song.file_path ?? "",
      bpmHint: song.bpm_hint ?? null,
      meterHint: song.meter_hint ?? "4/4",
      durationHintSec: song.duration_hint_sec ?? null,
    };
  }

  async function runListeningAction(
    action: () => Promise<void>,
    formatError: (error: unknown) => string,
  ) {
    await runBusyAction(async () => {
      try {
        await action();
      } catch (error) {
        onMessage(formatError(error));
      }
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

  async function refreshBenchmarkSweepReports() {
    try {
      const reports = await pipelineEngine.listening.loadBenchmarkSweepReports();
      startTransition(() => {
        setBenchmarkSweepReports(reports);
      });
    } catch (error) {
      onMessage(`Could not refresh benchmark reports: ${error}`);
    }
  }

  async function startListening() {
    await runListeningAction(
      async () => {
        await syncFileSourceIfNeeded();
        const result = await pipelineEngine.listening.start(profile, source);
        setAudioActive(true);
        await refreshListeningState();
        onMessage(result);
      },
      (error) => `Error: ${error}`,
    );
  }

  async function stopListening() {
    await runListeningAction(
      async () => {
        const result = await pipelineEngine.listening.stop();
        setAudioActive(false);
        setVideoActive(false);
        clearSnapshot();
        onMessage(result);
      },
      (error) => `Error: ${error}`,
    );
  }

  async function runListeningTest() {
    await runListeningAction(
      async () => {
        await syncFileSourceIfNeeded();
        const result = await pipelineEngine.listening.runTest(profile, source);
        setAudioActive(true);
        applySnapshot({
          timingState: result.timing_state,
          telemetry: result.telemetry,
        });
        onMessage(
          `Listening test completed: ${result.telemetry.fused_bpm.toFixed(1)} BPM, ${result.telemetry.sync_state}, grid ${result.one_bar_grid.one_bar_grid_score.toFixed(2)}.`,
        );
      },
      (error) => `Listening test failed: ${error}`,
    );
  }

  async function runBenchmarkListeningTest(songId: string) {
    await runListeningAction(
      async () => {
        const config = await pipelineEngine.listening.loadBenchmarkSongFileSource(songId);
        setSource("file");
        setFileSourceConfig(config);
        const result = await pipelineEngine.listening.runBenchmarkSongTest(profile, songId);
        setAudioActive(true);
        applySnapshot({
          timingState: result.timing_state,
          telemetry: result.telemetry,
        });
        onMessage(
          `Benchmark test completed: ${songId}, ${result.telemetry.fused_bpm.toFixed(1)} BPM, grid ${result.one_bar_grid.one_bar_grid_score.toFixed(2)}.`,
        );
      },
      (error) => `Benchmark test failed: ${error}`,
    );
  }

  async function toggleVideo() {
    await runListeningAction(
      async () => {
        const result = videoActive ? await pipelineEngine.output.stop() : await pipelineEngine.output.start();
        setVideoActive((currentValue) => !currentValue);
        onMessage(result);
      },
      (error) => `Error: ${error}`,
    );
  }

  async function adjustStructureLearning(action: string) {
    await runListeningAction(
      async () => {
        const updatedTelemetry = await pipelineEngine.listening.adjustStructureLearning(action);
        updateTelemetry(updatedTelemetry);
        onMessage(`Structure learning updated: ${action.split("_").join(" ")}`);
      },
      (error) => `Structure learning update failed: ${error}`,
    );
  }

  async function saveLearningEvaluation(songId: string, rating: string, note: string) {
    await runListeningAction(
      async () => {
        const updatedTelemetry = await pipelineEngine.listening.saveLearningEvaluation(songId, rating, note);
        updateTelemetry(updatedTelemetry);
        onMessage(`Evaluation saved: ${rating}`);
      },
      (error) => `Could not save evaluation: ${error}`,
    );
  }

  async function saveFilterSetupEvaluation(setupId: string, rating: string, note: string) {
    await runListeningAction(
      async () => {
        const updatedTelemetry = await pipelineEngine.listening.saveFilterSetupEvaluation(setupId, rating, note);
        updateTelemetry(updatedTelemetry);
        onMessage(`Setup evaluation saved: ${rating}`);
      },
      (error) => `Could not save setup evaluation: ${error}`,
    );
  }

  async function bindBenchmarkSongToCurrentFile(songId: string) {
    await runListeningAction(
      async () => {
        const songs = await pipelineEngine.listening.bindBenchmarkSongFile(
          songId,
          fileSourceConfig.filePath,
          fileSourceConfig.bpmHint,
          fileSourceConfig.meterHint || null,
          fileSourceConfig.durationHintSec,
        );
        mergeLearningSongsIntoTelemetry(songs);
        onMessage(`Benchmark linked to file source: ${songId}`);
      },
      (error) => `Could not bind benchmark file: ${error}`,
    );
  }

  function loadBenchmarkIntoFileSource(song: TestSongDefinition) {
    if (!song.file_path) {
      onMessage(`No saved benchmark file for ${song.id} yet.`);
      return;
    }

    startTransition(() => {
      setSource("file");
      setFileSourceConfig(toFileSourceConfig(song));
    });
    onMessage(`Benchmark file loaded into file source: ${song.id}`);
  }

  useEffect(() => {
    if (!isDesktopRuntimeAvailable()) {
      onMessage(BROWSER_PREVIEW_MESSAGE);
    }
    void pipelineEngine.listening.loadFileSourceConfig().then(setFileSourceConfig);
    void refreshListeningState();
    void refreshBenchmarkSweepReports();
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
    benchmarkSweepReports,
    setProfile,
    setSource,
    setFileSourceConfig,
    refreshListeningState,
    startListening,
    stopListening,
    runListeningTest,
    runBenchmarkListeningTest,
    toggleVideo,
    adjustStructureLearning,
    saveLearningEvaluation,
    saveFilterSetupEvaluation,
    bindBenchmarkSongToCurrentFile,
    loadBenchmarkIntoFileSource,
    refreshBenchmarkSweepReports,
  };
}
