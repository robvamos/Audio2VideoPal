import type { AppStateTone } from "../../types";

interface DiagnosticItem {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: AppStateTone;
}

interface TechnicalDiagnosticsPanelProps {
  diagnostics: DiagnosticItem[];
  breakpoints: string[];
  profile?: string;
  source?: string;
  syncState?: string;
  runId?: string;
}

export default function TechnicalDiagnosticsPanel({
  diagnostics,
  breakpoints,
  profile,
  source,
  syncState,
  runId,
}: TechnicalDiagnosticsPanelProps) {
  return (
    <div className="studio-grid">
      <section className="studio-panel">
        <h3>Critical checks</h3>
        <div className="diagnostic-grid">
          {diagnostics.length ? (
            diagnostics.map((check) => (
              <div key={`${check.label}-${check.id}`} className={`diagnostic-card ${check.tone}`}>
                <span>{check.label}</span>
                <strong>{check.value}</strong>
                <p>{check.detail}</p>
              </div>
            ))
          ) : (
            <p>No diagnostics captured yet.</p>
          )}
        </div>
      </section>

      <section className="studio-panel">
        <h3>Breakpoints</h3>
        <div className="recommendation-list">
          {breakpoints.length ? breakpoints.map((item) => <p key={item}>{item}</p>) : <p>No obvious breakpoint flagged.</p>}
        </div>
      </section>

      <section className="studio-panel">
        <h3>Runtime facts</h3>
        <div className="readiness-list">
          <div className="readiness-row">
            <span>Profile</span>
            <strong>{profile ?? "--"}</strong>
          </div>
          <div className="readiness-row">
            <span>Source</span>
            <strong>{source ?? "--"}</strong>
          </div>
          <div className="readiness-row">
            <span>Sync</span>
            <strong>{syncState ?? "--"}</strong>
          </div>
          <div className="readiness-row">
            <span>Run</span>
            <strong>{runId ?? "--"}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
