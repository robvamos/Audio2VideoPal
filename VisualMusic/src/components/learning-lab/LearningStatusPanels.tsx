import type { ListeningTelemetry } from "../../types";

interface LearningStatusPanelsProps {
  telemetry: ListeningTelemetry | null;
}

export default function LearningStatusPanels({ telemetry }: LearningStatusPanelsProps) {
  const learning = telemetry?.learning;

  return (
    <div className="studio-grid">
      <section className="studio-panel">
        <h3>Current stage</h3>
        <div className="readiness-list">
          <div className="readiness-row">
            <span>Adaptive stage</span>
            <strong>{learning?.current_stage ?? "--"}</strong>
          </div>
          <div className="readiness-row">
            <span>Rating scale</span>
            <strong>{learning?.rating_scale.join(" / ") ?? "--"}</strong>
          </div>
        </div>
      </section>

      <section className="studio-panel">
        <h3>Preprocessing gate</h3>
        <div className="readiness-list">
          <div className="readiness-row">
            <span>Reference path</span>
            <strong>{telemetry ? (telemetry.preprocessing.self_reference_enabled ? "ready" : "missing") : "--"}</strong>
          </div>
          <div className="readiness-row">
            <span>Residual ratio</span>
            <strong>{telemetry ? telemetry.preprocessing.residual_energy_ratio.toFixed(2) : "--"}</strong>
          </div>
          <div className="readiness-row">
            <span>Beat-1 lock</span>
            <strong>{telemetry?.sync_state ?? "--"}</strong>
          </div>
        </div>
      </section>

      <section className="studio-panel">
        <h3>Next milestones</h3>
        <div className="recommendation-list">
          {learning?.next_milestones.length ? (
            learning.next_milestones.map((item) => <p key={item}>{item}</p>)
          ) : (
            <p>No milestones captured yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
