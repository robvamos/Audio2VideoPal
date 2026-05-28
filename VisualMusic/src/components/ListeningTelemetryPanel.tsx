import type { ListeningTelemetry } from "../types";

interface ListeningTelemetryPanelProps {
  telemetry: ListeningTelemetry | null;
}

export default function ListeningTelemetryPanel({ telemetry }: ListeningTelemetryPanelProps) {
  return (
    <div className="studio-layout">
      <section className="studio-hero compact">
        <div>
          <p className="eyebrow">Telemetry View</p>
          <h2>Keep the run trace explicit so architecture decisions are tied to evidence, not just UI feel.</h2>
        </div>
      </section>

      <div className="studio-grid">
        <section className="studio-panel">
          <h3>Run identity</h3>
          <div className="readiness-list">
            <div className="readiness-row">
              <span>Run id</span>
              <strong>{telemetry?.run_id ?? "--"}</strong>
            </div>
            <div className="readiness-row">
              <span>Profile</span>
              <strong>{telemetry?.profile ?? "--"}</strong>
            </div>
            <div className="readiness-row">
              <span>Source</span>
              <strong>{telemetry?.source ?? "--"}</strong>
            </div>
            <div className="readiness-row">
              <span>Status</span>
              <strong>{telemetry?.status ?? "--"}</strong>
            </div>
          </div>
        </section>

        <section className="studio-panel">
          <h3>Artifacts</h3>
          <div className="path-list">
            <p>{telemetry?.telemetry_json_path ?? "No telemetry JSON yet."}</p>
            <p>{telemetry?.telemetry_summary_path ?? "No telemetry summary yet."}</p>
          </div>
        </section>

        <section className="studio-panel">
          <h3>Preprocessing</h3>
          <div className="readiness-list">
            <div className="readiness-row">
              <span>Self reference</span>
              <strong>{telemetry ? (telemetry.preprocessing.self_reference_enabled ? "enabled" : "disabled") : "--"}</strong>
            </div>
            <div className="readiness-row">
              <span>Residual ratio</span>
              <strong>{telemetry ? telemetry.preprocessing.residual_energy_ratio.toFixed(2) : "--"}</strong>
            </div>
            <div className="readiness-row">
              <span>Cancellation</span>
              <strong>{telemetry ? `${telemetry.preprocessing.cancellation_db.toFixed(1)} dB` : "--"}</strong>
            </div>
            <div className="readiness-row">
              <span>Latency align</span>
              <strong>{telemetry ? `${telemetry.preprocessing.latency_alignment_ms.toFixed(1)} ms` : "--"}</strong>
            </div>
          </div>
        </section>
      </div>

      <section className="studio-panel">
        <h3>Recommendations</h3>
        <div className="recommendation-list">
          {telemetry?.recommendations.length ? (
            telemetry.recommendations.map((item) => <p key={item}>{item}</p>)
          ) : (
            <p>No recommendations captured yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
