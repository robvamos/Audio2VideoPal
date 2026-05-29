import type { FilterSetupDefinition, TestSongDefinition } from "../../types";

interface ChooseStepProps {
  songs: TestSongDefinition[];
  setups: FilterSetupDefinition[];
  currentFilePath: string;
  selectedSongId: string;
  selectedSetupId: string;
  onSelectSong: (songId: string) => void;
  onSelectSetup: (setupId: string) => void;
  onStepSong: (delta: number) => void;
  onStepSetup: (delta: number) => void;
  onBindSongToCurrentFile: (songId: string) => Promise<void>;
}

export default function ChooseStep({
  songs,
  setups,
  currentFilePath,
  selectedSongId,
  selectedSetupId,
  onSelectSong,
  onSelectSetup,
  onStepSong,
  onStepSetup,
  onBindSongToCurrentFile,
}: ChooseStepProps) {
  const selectedSong = songs.find((song) => song.id === selectedSongId) ?? songs[0] ?? null;
  const selectedSetup = setups.find((setup) => setup.id === selectedSetupId) ?? setups[0] ?? null;

  return (
    <section className="studio-panel">
      <h3>Choose</h3>
      <div className="evaluation-layout">
        <div className="compact-selector-card">
          <div className="compact-selector-head">
            <h4>Benchmark</h4>
            <div className="compact-selector-actions">
              <button type="button" className="icon-button" onClick={() => onStepSong(-1)} title="Previous benchmark">
                {"<"}
              </button>
              <button type="button" className="icon-button" onClick={() => onStepSong(1)} title="Next benchmark">
                {">"}
              </button>
            </div>
          </div>
          {selectedSong ? (
            <>
              <div className="compact-selector-summary">
                <span className="stage-index">{selectedSong.id}</span>
                <strong>{selectedSong.focus}</strong>
              </div>
              <p>{selectedSong.expected_outcome}</p>
              <div className="readiness-list">
                <div className="readiness-row">
                  <span>Bound file</span>
                  <strong>{selectedSong.file_path ?? "--"}</strong>
                </div>
              </div>
              <div className="pipeline-actions">
                <button
                  type="button"
                  disabled={!currentFilePath}
                  onClick={() => void onBindSongToCurrentFile(selectedSong.id)}
                  title={currentFilePath ? "Bind the current file source to this benchmark" : "Configure a file source first"}
                >
                  Bind Current File
                </button>
              </div>
              <div className="compact-pill-row">
                {songs.map((song) => (
                  <button
                    key={song.id}
                    type="button"
                    className={`mini-pill ${selectedSongId === song.id ? "active" : ""}`}
                    onClick={() => onSelectSong(song.id)}
                    title={song.focus}
                  >
                    {song.id}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p>No benchmark song library yet.</p>
          )}
        </div>

        <div className="compact-selector-card">
          <div className="compact-selector-head">
            <h4>Setup</h4>
            <div className="compact-selector-actions">
              <button type="button" className="icon-button" onClick={() => onStepSetup(-1)} title="Previous setup">
                {"<"}
              </button>
              <button type="button" className="icon-button" onClick={() => onStepSetup(1)} title="Next setup">
                {">"}
              </button>
            </div>
          </div>
          {selectedSetup ? (
            <>
              <div className="compact-selector-summary">
                <span className="stage-index">{selectedSetup.id}</span>
                <strong>{selectedSetup.name}</strong>
              </div>
              <p>{selectedSetup.description}</p>
              <div className="module-list">
                {selectedSetup.modules.map((moduleName) => (
                  <span key={moduleName} className="module-pill active">
                    {moduleName}
                  </span>
                ))}
              </div>
              <div className="compact-pill-row">
                {setups.map((setup) => (
                  <button
                    key={setup.id}
                    type="button"
                    className={`mini-pill ${selectedSetupId === setup.id ? "active" : ""}`}
                    onClick={() => onSelectSetup(setup.id)}
                    title={setup.name}
                  >
                    {setup.name}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p>No filter setup catalog yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
