import type { MapPuzzleViewState } from "../../types";

interface TechnicalToolbarProps {
  viewState: MapPuzzleViewState;
  onUpdateViewState: (patch: Partial<MapPuzzleViewState>) => void;
  onApplyConfigPreset: (preset: "timing" | "reference" | "learning") => void;
}

export default function TechnicalToolbar({
  viewState,
  onUpdateViewState,
  onApplyConfigPreset,
}: TechnicalToolbarProps) {
  return (
    <section className="studio-panel">
      <h3>Console tecnica</h3>
      <div className="technical-toolbar-grid">
        <div className="technical-control-block">
          <span className="technical-label">Preset</span>
          <div className="compact-pill-row">
            <button type="button" className="mini-pill" onClick={() => onApplyConfigPreset("timing")} title="Focus on timing and lock">
              Timing
            </button>
            <button type="button" className="mini-pill" onClick={() => onApplyConfigPreset("reference")} title="Focus on drift and segment reconstruction">
              Drift
            </button>
            <button type="button" className="mini-pill" onClick={() => onApplyConfigPreset("learning")} title="Focus on learning and blocked steps">
              Learning
            </button>
          </div>
        </div>

        <div className="technical-control-block">
          <span className="technical-label">Diagnostica</span>
          <div className="compact-pill-row">
            {[
              { id: "timing", label: "Timing" },
              { id: "reference", label: "Reference" },
              { id: "learning", label: "Learning" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className={`mini-pill ${viewState.diagnosticsLens === item.id ? "active" : ""}`}
                onClick={() => onUpdateViewState({ diagnosticsLens: item.id as MapPuzzleViewState["diagnosticsLens"] })}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="technical-control-block">
          <span className="technical-label">Archi</span>
          <div className="compact-pill-row">
            {[
              { id: "all", label: "All" },
              { id: "active", label: "Active" },
              { id: "blocked", label: "Blocked" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className={`mini-pill ${viewState.edgeFilter === item.id ? "active" : ""}`}
                onClick={() => onUpdateViewState({ edgeFilter: item.id as MapPuzzleViewState["edgeFilter"] })}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="technical-control-block">
          <span className="technical-label">Confronto</span>
          <div className="compact-pill-row">
            {[
              { id: "split", label: "Split" },
              { id: "overlay", label: "Overlay" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className={`mini-pill ${viewState.compareMode === item.id ? "active" : ""}`}
                onClick={() => onUpdateViewState({ compareMode: item.id as MapPuzzleViewState["compareMode"] })}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
