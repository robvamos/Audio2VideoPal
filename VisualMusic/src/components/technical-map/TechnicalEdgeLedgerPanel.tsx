interface TechnicalEdgeLedgerPanelProps {
  edgeRows: [string, string][];
  activeSet: Set<string>;
  focusedModules: string[];
  onOpenAnalyzer: (targetType: "module" | "edge", targetId: string) => void;
}

export default function TechnicalEdgeLedgerPanel({
  edgeRows,
  activeSet,
  focusedModules,
  onOpenAnalyzer,
}: TechnicalEdgeLedgerPanelProps) {
  return (
    <section className="studio-panel">
      <h3>Edge ledger</h3>
      {edgeRows.length ? (
        <div className="edge-ledger">
          {edgeRows.map(([from, to]) => {
            const active = activeSet.has(from) && activeSet.has(to);
            const focused = focusedModules.includes(from) || focusedModules.includes(to);

            return (
              <div
                key={`${from}-${to}`}
                className={`edge-ledger-row ${active ? "active" : "blocked"} ${focused ? "focused" : ""}`}
              >
                <span>{from}</span>
                <strong>→</strong>
                <div className="edge-ledger-actions">
                  <span>{to}</span>
                  <button
                    type="button"
                    className="mini-pill technical-action"
                    onClick={() => onOpenAnalyzer("edge", `${from} -> ${to}`)}
                    title="Open flow analyzer for this edge"
                  >
                    Flow
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p>No edge data available for this filter.</p>
      )}
    </section>
  );
}
