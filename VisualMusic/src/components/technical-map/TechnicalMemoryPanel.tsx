import type { MapPuzzleViewState } from "../../types";

interface TechnicalMemoryPanelProps {
  didLoadState: boolean;
  viewState: MapPuzzleViewState;
  onUpdateViewState: (patch: Partial<MapPuzzleViewState>) => void;
}

export default function TechnicalMemoryPanel({
  didLoadState,
  viewState,
  onUpdateViewState,
}: TechnicalMemoryPanelProps) {
  return (
    <section className="studio-panel">
      <h3>Memoria tecnica</h3>
      <label className="pipeline-control">
        <span>Nota persistente</span>
        <textarea
          className="learning-note"
          value={viewState.memoryNote}
          onChange={(event) => onUpdateViewState({ memoryNote: event.target.value })}
          placeholder="Annota il puzzle attuale, i sospetti o la prossima prova da fare."
        />
      </label>
      <div className="readiness-list">
        <div className="readiness-row">
          <span>Persistenza</span>
          <strong>{didLoadState ? "attiva" : "caricamento"}</strong>
        </div>
        <div className="readiness-row">
          <span>Filtro archi</span>
          <strong>{viewState.edgeFilter}</strong>
        </div>
        <div className="readiness-row">
          <span>Modalita confronto</span>
          <strong>{viewState.compareMode}</strong>
        </div>
        <div className="readiness-row">
          <span>Analyzer</span>
          <strong>
            {viewState.analyzerTargetType ? `${viewState.analyzerTargetType}:${viewState.analyzerTargetId}` : "chiuso"}
          </strong>
        </div>
      </div>
    </section>
  );
}
