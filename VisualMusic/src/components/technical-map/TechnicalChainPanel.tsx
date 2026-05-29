interface TechnicalChainPanelProps {
  orderedModules: string[];
  activeSet: Set<string>;
  disabledSet: Set<string>;
  focusedModules: string[];
  onOpenAnalyzer: (targetType: "module" | "edge", targetId: string) => void;
}

export default function TechnicalChainPanel({
  orderedModules,
  activeSet,
  disabledSet,
  focusedModules,
  onOpenAnalyzer,
}: TechnicalChainPanelProps) {
  return (
    <section className="studio-panel">
      <h3>Architecture signal chain</h3>
      {orderedModules.length ? (
        <div className="chain-strip">
          {orderedModules.map((moduleName, index) => {
            const isActive = activeSet.has(moduleName);
            const isDisabled = disabledSet.has(moduleName);
            const isFocused = focusedModules.includes(moduleName);

            return (
              <div
                key={moduleName}
                className={`chain-node ${isActive ? "active" : ""} ${isDisabled ? "disabled" : ""} ${isFocused ? "focused" : ""}`}
              >
                <span className="chain-index">{index + 1}</span>
                <strong>{moduleName}</strong>
                <button
                  type="button"
                  className="mini-pill technical-action"
                  onClick={() => onOpenAnalyzer("module", moduleName)}
                  title="Open flow analyzer for this module"
                >
                  Scope
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p>No ordered chain available yet.</p>
      )}
    </section>
  );
}
