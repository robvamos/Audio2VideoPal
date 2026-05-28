import type { ListeningTelemetry, TimingState } from "../types";

interface ListeningControlRoomProps {
  audioActive: boolean;
  videoActive: boolean;
  isBusy: boolean;
  profile: string;
  source: string;
  timingState: TimingState | null;
  telemetry: ListeningTelemetry | null;
  onProfileChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onStartListening: () => Promise<void>;
  onStopListening: () => Promise<void>;
  onRunListeningTest: () => Promise<void>;
  onRefreshState: () => Promise<void>;
  onToggleVideo: () => Promise<void>;
}

export default function ListeningControlRoom({
  audioActive,
  videoActive,
  isBusy,
  profile,
  source,
  timingState,
  telemetry,
  onProfileChange,
  onSourceChange,
  onStartListening,
  onStopListening,
  onRunListeningTest,
  onRefreshState,
  onToggleVideo,
}: ListeningControlRoomProps) {
  return (
    <div className="studio-layout">
      <section className="studio-hero">
        <div>
          <p className="eyebrow">Listening Control Room</p>
          <h2>Run the timing core, inspect lock quality, then decide when the visual side should wake up.</h2>
        </div>
        <div className="hero-state">
          <span className={`state-badge ${audioActive ? "is-live" : "is-idle"}`}>
            {audioActive ? "Listening active" : "Listening idle"}
          </span>
          <span className={`state-badge ${videoActive ? "is-live" : "is-idle"}`}>
            {videoActive ? "Video path active" : "Video path idle"}
          </span>
        </div>
      </section>

      <div className="studio-grid">
        <section className="studio-panel">
          <h3>Run Setup</h3>
          <p>Keep the first slice deterministic: one profile, one source, one visible success path.</p>
          <label className="pipeline-control">
            <span>Profile</span>
            <select value={profile} onChange={(event) => onProfileChange(event.target.value)} disabled={isBusy}>
              <option value="minimal_one_bar_grid">minimal_one_bar_grid</option>
            </select>
          </label>
          <label className="pipeline-control">
            <span>Source</span>
            <select value={source} onChange={(event) => onSourceChange(event.target.value)} disabled={isBusy}>
              <option value="synthetic_pattern">synthetic_pattern</option>
              <option value="file" disabled>
                file (next slice)
              </option>
              <option value="internal_player" disabled>
                internal_player (next slice)
              </option>
              <option value="microphone" disabled>
                microphone (later)
              </option>
            </select>
          </label>
          <div className="pipeline-actions">
            <button onClick={() => void (audioActive ? onStopListening() : onStartListening())} disabled={isBusy}>
              {audioActive ? "Stop Listening" : "Start Listening"}
            </button>
            <button onClick={() => void onRunListeningTest()} disabled={isBusy}>
              Run Test
            </button>
            <button onClick={() => void onRefreshState()} disabled={isBusy}>
              Refresh
            </button>
          </div>
        </section>

        <section className="studio-panel">
          <h3>Live Timing</h3>
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
              <div key={beat} className={`grid-beat ${timingState?.beat_in_bar === beat ? "active" : ""}`}>
                {beat}
              </div>
            ))}
          </div>
        </section>

        <section className="studio-panel">
          <h3>Readiness Gate</h3>
          <p>
            The video output should stay secondary until the timing core is stable. This panel keeps that decision
            visible.
          </p>
          <div className="readiness-list">
            <div className="readiness-row">
              <span>Grid score</span>
              <strong>{telemetry ? telemetry.one_bar_grid_score.toFixed(2) : "--"}</strong>
            </div>
            <div className="readiness-row">
              <span>BPM confidence</span>
              <strong>{telemetry ? telemetry.bpm_confidence.toFixed(2) : "--"}</strong>
            </div>
            <div className="readiness-row">
              <span>Sync state</span>
              <strong>{telemetry?.sync_state ?? "--"}</strong>
            </div>
          </div>
          <button onClick={() => void onToggleVideo()} disabled={isBusy}>
            {videoActive ? "Stop Video Render" : "Start Video Render"}
          </button>
        </section>
      </div>
    </div>
  );
}
