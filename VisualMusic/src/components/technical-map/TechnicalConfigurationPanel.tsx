import type { FilterSetupDefinition, MapPuzzleViewState, TestSongDefinition } from "../../types";

interface TechnicalConfigurationPanelProps {
  songs: TestSongDefinition[];
  setups: FilterSetupDefinition[];
  selectedSong: TestSongDefinition | null;
  selectedSetup: FilterSetupDefinition | null;
  viewState: MapPuzzleViewState;
  onUpdateViewState: (patch: Partial<MapPuzzleViewState>) => void;
}

export default function TechnicalConfigurationPanel({
  songs,
  setups,
  selectedSong,
  selectedSetup,
  viewState,
  onUpdateViewState,
}: TechnicalConfigurationPanelProps) {
  return (
    <section className="studio-panel">
      <h3>Configurazione attiva</h3>
      <div className="technical-control-block">
        <span className="technical-label">Benchmark</span>
        <div className="compact-pill-row">
          {songs.length ? (
            songs.map((song) => (
              <button
                key={song.id}
                type="button"
                className={`mini-pill ${viewState.selectedSongId === song.id ? "active" : ""}`}
                onClick={() => onUpdateViewState({ selectedSongId: song.id })}
                title={song.focus}
              >
                {song.id}
              </button>
            ))
          ) : (
            <p>No benchmark song library yet.</p>
          )}
        </div>
      </div>

      <div className="technical-control-block">
        <span className="technical-label">Setup</span>
        <div className="compact-pill-row">
          {setups.length ? (
            setups.map((setup) => (
              <button
                key={setup.id}
                type="button"
                className={`mini-pill ${viewState.selectedSetupId === setup.id ? "active" : ""}`}
                onClick={() => onUpdateViewState({ selectedSetupId: setup.id })}
                title={setup.description}
              >
                {setup.name}
              </button>
            ))
          ) : (
            <p>No setup catalog yet.</p>
          )}
        </div>
      </div>

      <div className="readiness-list">
        <div className="readiness-row">
          <span>Benchmark corrente</span>
          <strong>{selectedSong?.focus ?? "--"}</strong>
        </div>
        <div className="readiness-row">
          <span>Bound file</span>
          <strong>{selectedSong?.file_path ?? "--"}</strong>
        </div>
        <div className="readiness-row">
          <span>Setup corrente</span>
          <strong>{selectedSetup?.name ?? "--"}</strong>
        </div>
        <div className="readiness-row">
          <span>Obiettivo</span>
          <strong>{selectedSetup?.goal ?? "--"}</strong>
        </div>
      </div>

      <div className="module-list">
        {selectedSetup?.modules.length ? (
          selectedSetup.modules.map((moduleName) => (
            <span key={moduleName} className="module-pill active">
              {moduleName}
            </span>
          ))
        ) : (
          <p>No module focus yet.</p>
        )}
      </div>
    </section>
  );
}
