import type { ListeningTelemetry, TimingState } from "../types";

interface ListeningPipelinePanelProps {
  timingState: TimingState | null;
  telemetry: ListeningTelemetry | null;
}

const STAGES = [
  {
    title: "Source",
    description: "Controlled input for the first listening slice.",
    modules: ["synthetic_pattern"],
  },
  {
    title: "Reference / Preprocessing",
    description: "Subtract the system's own output before higher-level timing inference.",
    modules: ["self_output_reference", "self_output_subtractor", "normalizer"],
  },
  {
    title: "Feature Extraction",
    description: "Detect rhythmic evidence used by the first timing pass.",
    modules: ["onset_strength", "low_band_pulse"],
  },
  {
    title: "Timing Analysis",
    description: "Estimate tempo, phase and downbeat candidates.",
    modules: [
      "tempo_autocorrelation",
      "window_stability_merge",
      "learning_grid",
      "weighted_tempo_fusion",
      "beat_grid_tracker",
      "simple_downbeat_scorer",
    ],
  },
  {
    title: "Evaluation",
    description: "Score the resulting one-bar grid and write telemetry.",
    modules: ["one_bar_grid_evaluator", "telemetry_writer"],
  },
];

export default function ListeningPipelinePanel({ timingState, telemetry }: ListeningPipelinePanelProps) {
  return (
    <div className="studio-layout">
      <section className="studio-hero compact">
        <div>
          <p className="eyebrow">Pipeline View</p>
          <h2>Make the listening path legible as a staged runtime, not just a start button and a result string.</h2>
        </div>
      </section>

      <div className="stage-list">
        {STAGES.map((stage) => (
          <section key={stage.title} className="stage-card">
            <div className="stage-header">
              <span className="stage-index">{stage.title}</span>
              <span className="stage-state">
                {telemetry?.wiring.active_modules.some((moduleName) => stage.modules.includes(moduleName))
                  ? "Active"
                  : "Planned"}
              </span>
            </div>
            <p>{stage.description}</p>
            <div className="module-list">
              {stage.modules.map((moduleName) => (
                <span
                  key={moduleName}
                  className={`module-pill ${
                    telemetry?.wiring.active_modules.includes(moduleName) ? "active" : "muted"
                  }`}
                >
                  {moduleName}
                </span>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="studio-panel">
        <h3>Current timing snapshot</h3>
        <div className="timing-readout">
          <div>
            <span>Meter</span>
            <strong>{timingState?.meter ?? "--"}</strong>
          </div>
          <div>
            <span>Bar</span>
            <strong>{timingState?.bar ?? "--"}</strong>
          </div>
          <div>
            <span>Next beat</span>
            <strong>{timingState?.next_beat_sec?.toFixed(2) ?? "--"}</strong>
          </div>
          <div>
            <span>Next downbeat</span>
            <strong>{timingState?.next_downbeat_sec?.toFixed(2) ?? "--"}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
