import type { ListeningTelemetry } from "../types";

interface LearningLabPanelProps {
  telemetry: ListeningTelemetry | null;
}

const CONVERGENCE_STAGES = [
  {
    id: "listening",
    title: "Listening",
    description: "Observe, align and avoid premature musical expansion.",
  },
  {
    id: "aligning",
    title: "Aligning",
    description: "Support cautiously while BPM and beat-1 evidence are still settling.",
  },
  {
    id: "supporting",
    title: "Supporting",
    description: "Increase musical presence only after stable lock and structure confidence.",
  },
  {
    id: "assertive",
    title: "Assertive",
    description: "Allow richer response only when the system keeps reliable timing and phase.",
  },
];

export default function LearningLabPanel({ telemetry }: LearningLabPanelProps) {
  const learning = telemetry?.learning;

  return (
    <div className="studio-layout">
      <section className="studio-hero compact">
        <div>
          <p className="eyebrow">Learning Lab</p>
          <h2>Turn benchmark songs, rating scale and confidence milestones into visible product behavior.</h2>
        </div>
      </section>

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

      <section className="studio-panel">
        <h3>Benchmark songs</h3>
        <div className="benchmark-grid">
          {learning?.test_songs.length ? (
            learning.test_songs.map((song) => (
              <article key={song.id} className="benchmark-card">
                <span className="stage-index">{song.id}</span>
                <h4>{song.focus}</h4>
                <p>{song.expected_outcome}</p>
              </article>
            ))
          ) : (
            <p>No benchmark song library yet.</p>
          )}
        </div>
      </section>

      <section className="studio-panel">
        <h3>Convergence roadmap</h3>
        <div className="benchmark-grid">
          {CONVERGENCE_STAGES.map((stage) => (
            <article
              key={stage.id}
              className={`benchmark-card ${learning?.current_stage === stage.id ? "is-current" : ""}`}
            >
              <span className="stage-index">{stage.title}</span>
              <p>{stage.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
