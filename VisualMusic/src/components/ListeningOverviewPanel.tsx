import type { ListeningTelemetry, TimingState } from "../types";

interface ListeningOverviewPanelProps {
  timingState: TimingState | null;
  telemetry: ListeningTelemetry | null;
}

export default function ListeningOverviewPanel({ timingState, telemetry }: ListeningOverviewPanelProps) {
  return (
    <div className="tab-content">
      <section className="overview-banner">
        <div>
          <p className="eyebrow">Project Overview</p>
          <h2>Audio2VideoPal now has separate rooms for system setup, listening control, pipeline wiring and telemetry.</h2>
        </div>
        <div className="overview-stats">
          <div>
            <span>Current BPM</span>
            <strong>{timingState?.bpm?.toFixed(1) ?? "--"}</strong>
          </div>
          <div>
            <span>Sync</span>
            <strong>{timingState?.sync_state ?? "--"}</strong>
          </div>
          <div>
            <span>Grid score</span>
            <strong>{telemetry?.one_bar_grid_score.toFixed(2) ?? "--"}</strong>
          </div>
        </div>
      </section>

      <div className="overview-grid">
        <section className="overview-card">
          <h3>Player</h3>
          <p>Load material, preview media and keep the listening slices grounded in real playback flows.</p>
        </section>
        <section className="overview-card">
          <h3>System</h3>
          <p>Keep database setup and FFmpeg diagnostics separate from music intelligence decisions.</p>
        </section>
        <section className="overview-card">
          <h3>Control Room</h3>
          <p>Start or stop listening, run the synthetic validation pass and decide when the output path is ready.</p>
        </section>
        <section className="overview-card">
          <h3>Pipeline / Wiring / Telemetry</h3>
          <p>Inspect the flow as distinct lenses instead of packing every concern into a single mixed panel.</p>
        </section>
      </div>

      <section className="studio-panel">
        <h3>Current listening snapshot</h3>
        <div className="overview-stats">
          <div>
            <span>Meter</span>
            <strong>{timingState?.meter ?? "--"}</strong>
          </div>
          <div>
            <span>Current beat</span>
            <strong>{timingState?.beat_in_bar ?? "--"}</strong>
          </div>
          <div>
            <span>Source</span>
            <strong>{telemetry?.source ?? "--"}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
