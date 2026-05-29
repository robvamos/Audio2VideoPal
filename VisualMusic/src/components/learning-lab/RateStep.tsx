import type {
  BenchmarkRunEntry,
  FilterSetupDefinition,
  FilterSetupEvaluationEntry,
  LearningEvaluationEntry,
  TestSongDefinition,
} from "../../types";

interface RateStepProps {
  selectedSong: TestSongDefinition | null;
  selectedSetup: FilterSetupDefinition | null;
  ratingScale: string[];
  benchmarkRunHistory: BenchmarkRunEntry[];
  evaluationHistory: LearningEvaluationEntry[];
  setupEvaluationHistory: FilterSetupEvaluationEntry[];
  selectedRating: string;
  note: string;
  setupRating: string;
  setupNote: string;
  isBusy: boolean;
  canSaveSong: boolean;
  canSaveSetup: boolean;
  onSelectRating: (rating: string) => void;
  onSelectSetupRating: (rating: string) => void;
  onNoteChange: (value: string) => void;
  onSetupNoteChange: (value: string) => void;
  onSaveEvaluation: () => Promise<void>;
  onSaveSetupEvaluation: () => Promise<void>;
}

export default function RateStep({
  selectedSong,
  selectedSetup,
  ratingScale,
  benchmarkRunHistory,
  evaluationHistory,
  setupEvaluationHistory,
  selectedRating,
  note,
  setupRating,
  setupNote,
  isBusy,
  canSaveSong,
  canSaveSetup,
  onSelectRating,
  onSelectSetupRating,
  onNoteChange,
  onSetupNoteChange,
  onSaveEvaluation,
  onSaveSetupEvaluation,
}: RateStepProps) {
  const filteredBenchmarkRuns = benchmarkRunHistory.filter((entry) => entry.song_id === selectedSong?.id).slice(0, 8);

  return (
    <section className="studio-panel">
      <h3>Rate</h3>
      <div className="evaluation-layout">
        <div className="evaluation-history">
          <h4>Recent benchmark runs</h4>
          <div className="recommendation-list">
            {filteredBenchmarkRuns.length ? (
              filteredBenchmarkRuns.map((entry) => (
                <div key={`${entry.timestamp}-${entry.song_id}-${entry.file_path}`} className="history-card">
                  <strong>{entry.song_id}</strong>
                  <span>{entry.sync_state}</span>
                  <small>
                    grid {entry.one_bar_grid_score.toFixed(2)} | residual {(entry.residual_energy_ratio * 100).toFixed(1)}% | bpm{" "}
                    {entry.fused_bpm.toFixed(1)}
                  </small>
                  <p>{entry.file_path || "No file path recorded."}</p>
                </div>
              ))
            ) : (
              <p>No benchmark runs recorded yet for this song.</p>
            )}
          </div>
        </div>
      </div>

      <div className="evaluation-layout">
        <div className="evaluation-form">
          <div className="readiness-row">
            <span>Benchmark</span>
            <strong>{selectedSong?.id ?? "--"}</strong>
          </div>
          <div className="rating-row">
            {ratingScale.map((rating) => (
              <button
                key={rating}
                type="button"
                className={`rating-pill ${selectedRating === rating ? "active" : ""}`}
                onClick={() => onSelectRating(rating)}
                disabled={isBusy}
              >
                {rating}
              </button>
            ))}
          </div>
          <label className="pipeline-control">
            <span title="Optional short note">Note</span>
            <textarea
              className="learning-note"
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="Quick reason"
            />
          </label>
          <div className="pipeline-actions">
            <button onClick={() => void onSaveEvaluation()} disabled={isBusy || !canSaveSong}>
              Save
            </button>
          </div>
        </div>

        <div className="evaluation-history">
          <h4>Recent evaluations</h4>
          <div className="recommendation-list">
            {evaluationHistory.length ? (
              evaluationHistory.map((entry) => (
                <div key={`${entry.timestamp}-${entry.song_id}`} className="history-card">
                  <strong>{entry.song_id}</strong>
                  <span>{entry.rating}</span>
                  <small>
                    error {(entry.average_error_ratio * 100).toFixed(1)}% | offset {entry.segment_offset_ratio.toFixed(3)} | scale{" "}
                    {entry.segment_scale_ratio.toFixed(3)}
                  </small>
                  <p>{entry.note || "No note recorded."}</p>
                </div>
              ))
            ) : (
              <p>No evaluations recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="evaluation-layout">
        <div className="evaluation-form">
          <div className="readiness-row">
            <span>Filter setup</span>
            <strong>{selectedSetup?.name ?? "--"}</strong>
          </div>
          <div className="readiness-row">
            <span>Goal</span>
            <strong>{selectedSetup?.goal ?? "--"}</strong>
          </div>
          <div className="module-list">
            {selectedSetup?.modules.map((moduleName) => (
              <span key={moduleName} className="module-pill active">
                {moduleName}
              </span>
            ))}
          </div>
          <div className="rating-row">
            {ratingScale.map((rating) => (
              <button
                key={`setup-${rating}`}
                type="button"
                className={`rating-pill ${setupRating === rating ? "active" : ""}`}
                onClick={() => onSelectSetupRating(rating)}
                disabled={isBusy}
              >
                {rating}
              </button>
            ))}
          </div>
          <label className="pipeline-control">
            <span title="Optional short note">Note</span>
            <textarea
              className="learning-note"
              value={setupNote}
              onChange={(event) => onSetupNoteChange(event.target.value)}
              placeholder="Quick behavior note"
            />
          </label>
          <div className="pipeline-actions">
            <button onClick={() => void onSaveSetupEvaluation()} disabled={isBusy || !canSaveSetup}>
              Save Setup
            </button>
          </div>
        </div>

        <div className="evaluation-history">
          <h4>Recent setup evaluations</h4>
          <div className="recommendation-list">
            {setupEvaluationHistory.length ? (
              setupEvaluationHistory.map((entry) => (
                <div key={`${entry.timestamp}-${entry.setup_id}`} className="history-card">
                  <strong>{entry.setup_id}</strong>
                  <span>{entry.rating}</span>
                  <small>{entry.goal}</small>
                  <p>{entry.note || "No note recorded."}</p>
                </div>
              ))
            ) : (
              <p>No setup evaluations recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
