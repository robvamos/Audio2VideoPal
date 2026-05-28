import { useEffect, useState } from "react";
import { pipelineEngine } from "../engines/pipelineEngine";
import type { ListeningTelemetry, TimingState } from "../types";

interface AudioVideoPipelineProps {
  onMessage: (value: string) => void;
}

export default function AudioVideoPipeline({ onMessage }: AudioVideoPipelineProps) {
  const [audioActive, setAudioActive] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [profile, setProfile] = useState("minimal_one_bar_grid");
  const [source, setSource] = useState("synthetic_pattern");
  const [timingState, setTimingState] = useState<TimingState | null>(null);
  const [telemetry, setTelemetry] = useState<ListeningTelemetry | null>(null);

  async function refreshListeningState() {
    try {
      const [latestTimingState, latestTelemetry] = await Promise.all([
        pipelineEngine.listening.getLatestTimingState(),
        pipelineEngine.listening.getLatestTelemetry(),
      ]);
      setTimingState(latestTimingState);
      setTelemetry(latestTelemetry);
    } catch (error) {
      onMessage(`Could not refresh listening state: ${error}`);
    }
  }

  async function toggleAudio() {
    try {
      setIsBusy(true);
      const result = audioActive
        ? await pipelineEngine.listening.stop()
        : await pipelineEngine.listening.start(profile, source);
      setAudioActive(!audioActive);
      if (!audioActive) {
        await refreshListeningState();
      }
      onMessage(result);
    } catch (error) {
      onMessage(`Error: ${error}`);
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

  async function handleRunListeningTest() {
    try {
      setIsBusy(true);
      const result = await pipelineEngine.listening.runTest(profile, source);
      setTimingState(result.timing_state);
      setTelemetry(result.telemetry);
      setAudioActive(true);
      onMessage(
        `Listening test completed: ${result.telemetry.fused_bpm.toFixed(1)} BPM, ${result.telemetry.sync_state}, grid ${result.one_bar_grid.one_bar_grid_score.toFixed(2)}.`,
      );
    } catch (error) {
      onMessage(`Listening test failed: ${error}`);
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    refreshListeningState();
  }, []);

  return (
    <div className="pipeline-grid">
      <div className="pipeline-panel">
        <h2>Listening Pipeline</h2>
        <p>Start from a controlled synthetic pattern so the first slice can prove BPM, downbeat, grid and telemetry.</p>
        <label className="pipeline-control">
          <span>Profile</span>
          <select value={profile} onChange={(event) => setProfile(event.target.value)} disabled={isBusy}>
            <option value="minimal_one_bar_grid">minimal_one_bar_grid</option>
          </select>
        </label>
        <label className="pipeline-control">
          <span>Source</span>
          <select value={source} onChange={(event) => setSource(event.target.value)} disabled={isBusy}>
            <option value="synthetic_pattern">synthetic_pattern</option>
            <option value="file" disabled>
              file (next step)
            </option>
            <option value="internal_player" disabled>
              internal_player (next step)
            </option>
            <option value="microphone" disabled>
              microphone (next step)
            </option>
          </select>
        </label>
        <div className="pipeline-actions">
          <button onClick={toggleAudio} disabled={isBusy}>
            {audioActive ? "Stop Listening Pipeline" : "Start Listening Pipeline"}
          </button>
          <button onClick={handleRunListeningTest} disabled={isBusy}>
            Run Listening Test
          </button>
          <button onClick={refreshListeningState} disabled={isBusy}>
            Refresh State
          </button>
        </div>
        <p>Status: {audioActive ? "Running" : "Stopped"} via listening facade</p>
        <div className="pipeline-metrics">
          <div>
            <span>BPM</span>
            <strong>{timingState?.bpm?.toFixed(1) ?? "--"}</strong>
          </div>
          <div>
            <span>Sync</span>
            <strong>{timingState?.sync_state ?? "--"}</strong>
          </div>
          <div>
            <span>Beat</span>
            <strong>{timingState?.beat_in_bar ?? "--"}</strong>
          </div>
          <div>
            <span>Downbeat</span>
            <strong>{timingState ? timingState.downbeat_confidence.toFixed(2) : "--"}</strong>
          </div>
        </div>
        <div className="grid-strip" aria-label="One bar grid">
          {[1, 2, 3, 4].map((beat) => (
            <div
              key={beat}
              className={`grid-beat ${timingState?.beat_in_bar === beat ? "active" : ""}`}
            >
              {beat}
            </div>
          ))}
        </div>
      </div>

      <div className="pipeline-panel">
        <h2>Telemetry And Output</h2>
        <p>The video side stays separate, while listening telemetry shows whether the core timing slice is stable enough to evolve.</p>
        <button onClick={toggleVideo} disabled={isBusy}>
          {videoActive ? "Stop Video Render" : "Start Video Render"}
        </button>
        <p>Status: {videoActive ? "Active" : "Idle"}</p>
        <div className="telemetry-card">
          <h3>Latest telemetry</h3>
          {telemetry ? (
            <>
              <p>Run: {telemetry.run_id}</p>
              <p>Grid score: {telemetry.one_bar_grid_score.toFixed(2)}</p>
              <p>BPM confidence: {telemetry.bpm_confidence.toFixed(2)}</p>
              <p>JSON: {telemetry.telemetry_json_path}</p>
              <p>Summary: {telemetry.telemetry_summary_path}</p>
              <div className="module-list">
                {telemetry.wiring.active_modules.map((moduleName) => (
                  <span key={moduleName} className="module-pill active">
                    {moduleName}
                  </span>
                ))}
                {telemetry.wiring.disabled_modules.map((moduleName) => (
                  <span key={moduleName} className="module-pill muted">
                    {moduleName}
                  </span>
                ))}
              </div>
              <div className="recommendation-list">
                {telemetry.recommendations.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </>
          ) : (
            <p>No listening telemetry yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
