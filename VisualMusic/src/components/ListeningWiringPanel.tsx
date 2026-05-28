import type { ListeningTelemetry } from "../types";

interface ListeningWiringPanelProps {
  telemetry: ListeningTelemetry | null;
}

export default function ListeningWiringPanel({ telemetry }: ListeningWiringPanelProps) {
  return (
    <div className="studio-layout">
      <section className="studio-hero compact">
        <div>
          <p className="eyebrow">Wiring View</p>
          <h2>Inspect what is actually wired today, what is intentionally disabled, and how the next slices should connect.</h2>
        </div>
      </section>

      <div className="wiring-grid">
        <section className="studio-panel">
          <h3>Active modules</h3>
          <div className="module-list">
            {telemetry?.wiring.active_modules.length ? (
              telemetry.wiring.active_modules.map((moduleName) => (
                <span key={moduleName} className="module-pill active">
                  {moduleName}
                </span>
              ))
            ) : (
              <p>No wiring captured yet.</p>
            )}
          </div>
        </section>

        <section className="studio-panel">
          <h3>Disabled modules</h3>
          <div className="module-list">
            {telemetry?.wiring.disabled_modules.length ? (
              telemetry.wiring.disabled_modules.map((moduleName) => (
                <span key={moduleName} className="module-pill muted">
                  {moduleName}
                </span>
              ))
            ) : (
              <p>No disabled module list yet.</p>
            )}
          </div>
        </section>
      </div>

      <section className="studio-panel">
        <h3>Module edges</h3>
        {telemetry?.wiring.module_edges.length ? (
          <div className="edge-list">
            {telemetry.wiring.module_edges.map(([from, to]) => (
              <div key={`${from}-${to}`} className="edge-row">
                <span>{from}</span>
                <strong>→</strong>
                <span>{to}</span>
              </div>
            ))}
          </div>
        ) : (
          <p>No edge map available yet.</p>
        )}
      </section>

      <section className="studio-panel">
        <h3>Next wiring passes</h3>
        <div className="recommendation-list">
          <p>Add `file_source` once the synthetic baseline remains stable across repeated runs.</p>
          <p>Expose per-module evidence before introducing microphone capture or visual triggering.</p>
          <p>Keep output-generation modules disabled until the lock gate is visibly reliable.</p>
        </div>
      </section>
    </div>
  );
}
