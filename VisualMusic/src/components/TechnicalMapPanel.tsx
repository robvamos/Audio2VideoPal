import type { ListeningTelemetry } from "../types";

interface TechnicalMapPanelProps {
  telemetry: ListeningTelemetry | null;
}

function buildOrderedModules(edges: [string, string][]) {
  if (!edges.length) {
    return [];
  }

  const targets = new Set(edges.map(([, to]) => to));
  const starters = edges.map(([from]) => from).filter((from) => !targets.has(from));
  const start = starters[0] ?? edges[0][0];
  const ordered = [start];
  const visited = new Set<string>([start]);

  let cursor = start;
  while (true) {
    const nextEdge = edges.find(([from]) => from === cursor);
    if (!nextEdge) {
      break;
    }

    const next = nextEdge[1];
    if (visited.has(next)) {
      break;
    }

    ordered.push(next);
    visited.add(next);
    cursor = next;
  }

  return ordered;
}

function metricTone(value: number, warnAt: number, dangerAt: number) {
  if (value >= dangerAt) {
    return "danger";
  }
  if (value >= warnAt) {
    return "warning";
  }
  return "good";
}

export default function TechnicalMapPanel({ telemetry }: TechnicalMapPanelProps) {
  const wiring = telemetry?.wiring;
  const comparison = telemetry?.learning.structure_comparison;
  const orderedModules = buildOrderedModules(wiring?.module_edges ?? []);
  const activeSet = new Set(wiring?.active_modules ?? []);
  const disabledSet = new Set(wiring?.disabled_modules ?? []);

  const architectureChecks = telemetry
    ? [
        {
          label: "Residual",
          value: `${(telemetry.preprocessing.residual_energy_ratio * 100).toFixed(1)}%`,
          tone: metricTone(telemetry.preprocessing.residual_energy_ratio, 0.28, 0.45),
        },
        {
          label: "Phase drift",
          value: comparison ? comparison.segment_offset_ratio.toFixed(3) : "--",
          tone: metricTone(Math.abs(comparison?.segment_offset_ratio ?? 0), 0.04, 0.1),
        },
        {
          label: "Scale drift",
          value: comparison ? comparison.segment_scale_ratio.toFixed(3) : "--",
          tone: metricTone(Math.abs((comparison?.segment_scale_ratio ?? 1) - 1), 0.05, 0.12),
        },
        {
          label: "Grid score",
          value: telemetry.one_bar_grid_score.toFixed(2),
          tone: telemetry.one_bar_grid_score < 0.7 ? "danger" : telemetry.one_bar_grid_score < 0.85 ? "warning" : "good",
        },
      ]
    : [];

  const breakpoints = telemetry
    ? [
        telemetry.preprocessing.self_reference_enabled
          ? null
          : "Reference path still missing: subtraction quality cannot be trusted yet.",
        telemetry.preprocessing.residual_energy_ratio > 0.35
          ? "Residual energy is still high: the self-output subtraction stage needs tuning."
          : null,
        comparison && Math.abs(comparison.segment_offset_ratio) > 0.05
          ? "Structure offset is visibly drifting: alignment is slipping before reconstruction."
          : null,
        comparison && Math.abs(comparison.segment_scale_ratio - 1) > 0.08
          ? "Structure width is unstable: segment duration learning is stretching or compressing too much."
          : null,
        wiring?.disabled_modules.includes("file_source")
          ? "Real file source is still out of chain: current map is only partially representative."
          : null,
      ].filter(Boolean)
    : [];

  return (
    <div className="studio-layout">
      <section className="studio-hero compact">
        <div>
          <p className="eyebrow">Debug Logica Ricostruzione Mappa</p>
          <h2>Vista tecnica del puzzle della mappa: catena, rotture, drift e ricostruzione dei segmenti.</h2>
        </div>
      </section>

      <section className="studio-panel">
        <h3>Architecture signal chain</h3>
        {orderedModules.length ? (
          <div className="chain-strip">
            {orderedModules.map((moduleName, index) => {
              const isActive = activeSet.has(moduleName);
              const isDisabled = disabledSet.has(moduleName);

              return (
                <div key={moduleName} className={`chain-node ${isActive ? "active" : ""} ${isDisabled ? "disabled" : ""}`}>
                  <span className="chain-index">{index + 1}</span>
                  <strong>{moduleName}</strong>
                </div>
              );
            })}
          </div>
        ) : (
          <p>No ordered chain available yet.</p>
        )}
      </section>

      <div className="studio-grid">
        <section className="studio-panel">
          <h3>Critical checks</h3>
          <div className="diagnostic-grid">
            {architectureChecks.length ? (
              architectureChecks.map((check) => (
                <div key={check.label} className={`diagnostic-card ${check.tone}`}>
                  <span>{check.label}</span>
                  <strong>{check.value}</strong>
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
              <strong>{telemetry?.profile ?? "--"}</strong>
            </div>
            <div className="readiness-row">
              <span>Source</span>
              <strong>{telemetry?.source ?? "--"}</strong>
            </div>
            <div className="readiness-row">
              <span>Sync</span>
              <strong>{telemetry?.sync_state ?? "--"}</strong>
            </div>
            <div className="readiness-row">
              <span>Run</span>
              <strong>{telemetry?.run_id ?? "--"}</strong>
            </div>
          </div>
        </section>
      </div>

      <div className="evaluation-layout">
        <section className="studio-panel">
          <h3>Edge ledger</h3>
          {wiring?.module_edges.length ? (
            <div className="edge-ledger">
              {wiring.module_edges.map(([from, to]) => {
                const active = activeSet.has(from) && activeSet.has(to);
                return (
                  <div key={`${from}-${to}`} className={`edge-ledger-row ${active ? "active" : "blocked"}`}>
                    <span>{from}</span>
                    <strong>→</strong>
                    <span>{to}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p>No edge data available yet.</p>
          )}
        </section>

        <section className="studio-panel">
          <h3>Puzzle della mappa</h3>
          {comparison ? (
            <div className="map-puzzle-panel">
              <div className="map-puzzle-header">
                <span>Target {comparison.target_label}</span>
                <strong>error {(comparison.average_error_ratio * 100).toFixed(1)}%</strong>
              </div>
              <div className="structure-track-card compact">
                <span className="structure-track-label">Reference</span>
                <div className="structure-track">
                  {comparison.reference_segments.map((segment) => (
                    <div
                      key={`tech-ref-${segment.label}-${segment.start_ratio}`}
                      className="structure-segment reference"
                      style={{
                        left: `${segment.start_ratio * 100}%`,
                        width: `${(segment.end_ratio - segment.start_ratio) * 100}%`,
                      }}
                      title={`${segment.label}: ${Math.round(segment.start_ratio * 100)}% - ${Math.round(segment.end_ratio * 100)}%`}
                    >
                      <span>{segment.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="structure-track-card compact">
                <span className="structure-track-label">Reconstruction</span>
                <div className="structure-track">
                  {comparison.reconstructed_segments.map((segment) => (
                    <div
                      key={`tech-recon-${segment.label}-${segment.start_ratio}`}
                      className="structure-segment reconstructed"
                      style={{
                        left: `${segment.start_ratio * 100}%`,
                        width: `${(segment.end_ratio - segment.start_ratio) * 100}%`,
                      }}
                      title={`${segment.label}: ${Math.round(segment.start_ratio * 100)}% - ${Math.round(segment.end_ratio * 100)}%`}
                    >
                      <span>{segment.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p>No segment map available yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
