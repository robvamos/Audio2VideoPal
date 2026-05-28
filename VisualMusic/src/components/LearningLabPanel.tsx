import { useEffect, useState } from "react";
import type { ListeningTelemetry } from "../types";

interface LearningLabPanelProps {
  telemetry: ListeningTelemetry | null;
  isBusy: boolean;
  onAdjustStructureLearning: (action: string) => Promise<void>;
  onRerunListeningTest: () => Promise<void>;
  onSaveLearningEvaluation: (songId: string, rating: string, note: string) => Promise<void>;
}

const CONVERGENCE_STAGES = [
  {
    id: "listening",
    title: "Listening",
    description: "Observe, align and avoid premature musical expansion.",
  },
  {
    id: "aligning",
    title: "Aligning",
    description: "Support cautiously while BPM and beat-1 evidence are still settling.",
  },
  {
    id: "supporting",
    title: "Supporting",
    description: "Increase musical presence only after stable lock and structure confidence.",
  },
  {
    id: "assertive",
    title: "Assertive",
    description: "Allow richer response only when the system keeps reliable timing and phase.",
  },
];

const FLOW_STEPS = [
  { id: "choose", label: "1. Choose" },
  { id: "compare", label: "2. Compare" },
  { id: "rate", label: "3. Rate" },
] as const;

type FlowStep = (typeof FLOW_STEPS)[number]["id"];

export default function LearningLabPanel({
  telemetry,
  isBusy,
  onAdjustStructureLearning,
  onRerunListeningTest,
  onSaveLearningEvaluation,
}: LearningLabPanelProps) {
  const learning = telemetry?.learning;
  const comparison = learning?.structure_comparison;
  const [activeStep, setActiveStep] = useState<FlowStep>("choose");
  const [selectedSongId, setSelectedSongId] = useState("");
  const [selectedRating, setSelectedRating] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!selectedSongId && learning?.test_songs[0]) {
      setSelectedSongId(learning.test_songs[0].id);
    }
    if (!selectedRating && learning?.rating_scale[0]) {
      setSelectedRating(learning.rating_scale[0]);
    }
  }, [learning, selectedRating, selectedSongId]);

  const selectedSong = learning?.test_songs.find((song) => song.id === selectedSongId) ?? learning?.test_songs[0] ?? null;

  async function handleSaveEvaluation() {
    if (!selectedSongId || !selectedRating) {
      return;
    }
    await onSaveLearningEvaluation(selectedSongId, selectedRating, note);
    setNote("");
  }

  return (
    <div className="studio-layout">
      <section className="studio-hero compact">
        <div>
          <p className="eyebrow">Learning Lab</p>
          <h2>Use a simple choose, compare and rate flow so learning stays operable instead of feeling buried in telemetry.</h2>
        </div>
      </section>

      <div className="learning-nav">
        {FLOW_STEPS.map((step) => (
          <button
            key={step.id}
            className={`learning-nav-button ${activeStep === step.id ? "active" : ""}`}
            onClick={() => setActiveStep(step.id)}
            type="button"
          >
            {step.label}
          </button>
        ))}
      </div>

      <div className="studio-grid">
        <section className="studio-panel">
          <h3>Current stage</h3>
          <div className="readiness-list">
            <div className="readiness-row">
              <span>Adaptive stage</span>
              <strong>{learning?.current_stage ?? "--"}</strong>
            </div>
            <div className="readiness-row">
              <span>Rating scale</span>
              <strong>{learning?.rating_scale.join(" / ") ?? "--"}</strong>
            </div>
          </div>
        </section>

        <section className="studio-panel">
          <h3>Preprocessing gate</h3>
          <div className="readiness-list">
            <div className="readiness-row">
              <span>Reference path</span>
              <strong>{telemetry ? (telemetry.preprocessing.self_reference_enabled ? "ready" : "missing") : "--"}</strong>
            </div>
            <div className="readiness-row">
              <span>Residual ratio</span>
              <strong>{telemetry ? telemetry.preprocessing.residual_energy_ratio.toFixed(2) : "--"}</strong>
            </div>
            <div className="readiness-row">
              <span>Beat-1 lock</span>
              <strong>{telemetry?.sync_state ?? "--"}</strong>
            </div>
          </div>
        </section>

        <section className="studio-panel">
          <h3>Next milestones</h3>
          <div className="recommendation-list">
            {learning?.next_milestones.length ? (
              learning.next_milestones.map((item) => <p key={item}>{item}</p>)
            ) : (
              <p>No milestones captured yet.</p>
            )}
          </div>
        </section>
      </div>

      {activeStep === "choose" && (
        <section className="studio-panel">
          <h3>Choose benchmark</h3>
          <div className="benchmark-grid">
            {learning?.test_songs.length ? (
              learning.test_songs.map((song) => (
                <button
                  key={song.id}
                  type="button"
                  className={`benchmark-card benchmark-button ${selectedSongId === song.id ? "is-current" : ""}`}
                  onClick={() => setSelectedSongId(song.id)}
                >
                  <span className="stage-index">{song.id}</span>
                  <h4>{song.focus}</h4>
                  <p>{song.expected_outcome}</p>
                </button>
              ))
            ) : (
              <p>No benchmark song library yet.</p>
            )}
          </div>
        </section>
      )}

      {activeStep === "compare" && (
        <section className="studio-panel">
          <h3>Compare and correct</h3>
          <p>
            Reference and reconstruction stay side by side. Use the quick controls until the thick segment strokes align
            in a way that feels visually honest.
          </p>

          {comparison ? (
            <div className="structure-compare-layout">
              <div className="structure-compare-main">
                <div className="readiness-row">
                  <span>Selected benchmark</span>
                  <strong>{selectedSong?.id ?? comparison.target_label}</strong>
                </div>
                <div className="readiness-row">
                  <span>Average segment error</span>
                  <strong>{(comparison.average_error_ratio * 100).toFixed(1)}%</strong>
                </div>
                <div className="readiness-row">
                  <span>Offset</span>
                  <strong>{comparison.segment_offset_ratio.toFixed(3)}</strong>
                </div>
                <div className="readiness-row">
                  <span>Scale</span>
                  <strong>{comparison.segment_scale_ratio.toFixed(3)}</strong>
                </div>

                <div className="pipeline-actions">
                  <button onClick={() => void onAdjustStructureLearning("shift_left")} disabled={isBusy}>
                    Shift Left
                  </button>
                  <button onClick={() => void onAdjustStructureLearning("shift_right")} disabled={isBusy}>
                    Shift Right
                  </button>
                  <button onClick={() => void onAdjustStructureLearning("compress")} disabled={isBusy}>
                    Compress
                  </button>
                  <button onClick={() => void onAdjustStructureLearning("expand")} disabled={isBusy}>
                    Expand
                  </button>
                  <button onClick={() => void onAdjustStructureLearning("reset")} disabled={isBusy}>
                    Reset
                  </button>
                  <button onClick={() => void onRerunListeningTest()} disabled={isBusy}>
                    Rebuild Run
                  </button>
                </div>
              </div>

              <aside className="structure-compare-side">
                <div className="structure-track-card">
                  <span className="structure-track-label">Reference structure</span>
                  <div className="structure-track">
                    {comparison.reference_segments.map((segment) => (
                      <div
                        key={`ref-${segment.label}-${segment.start_ratio}`}
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

                <div className="structure-track-card">
                  <span className="structure-track-label">Reconstructed segments</span>
                  <div className="structure-track">
                    {comparison.reconstructed_segments.map((segment) => (
                      <div
                        key={`recon-${segment.label}-${segment.start_ratio}`}
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
              </aside>
            </div>
          ) : (
            <p>No structure comparison captured yet.</p>
          )}
        </section>
      )}

      {activeStep === "rate" && (
        <section className="studio-panel">
          <h3>Rate and register</h3>
          <div className="evaluation-layout">
            <div className="evaluation-form">
              <div className="readiness-row">
                <span>Benchmark</span>
                <strong>{selectedSong?.id ?? "--"}</strong>
              </div>
              <div className="rating-row">
                {learning?.rating_scale.map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    className={`rating-pill ${selectedRating === rating ? "active" : ""}`}
                    onClick={() => setSelectedRating(rating)}
                    disabled={isBusy}
                  >
                    {rating}
                  </button>
                ))}
              </div>
              <label className="pipeline-control">
                <span>Short note</span>
                <textarea
                  className="learning-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Why was this configuration good or bad?"
                />
              </label>
              <div className="pipeline-actions">
                <button onClick={() => void handleSaveEvaluation()} disabled={isBusy || !selectedSongId || !selectedRating}>
                  Register Evaluation
                </button>
              </div>
            </div>

            <div className="evaluation-history">
              <h4>Recent evaluations</h4>
              <div className="recommendation-list">
                {learning?.evaluation_history.length ? (
                  learning.evaluation_history.map((entry) => (
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
        </section>
      )}

      <section className="studio-panel">
        <h3>Convergence roadmap</h3>
        <div className="benchmark-grid">
          {CONVERGENCE_STAGES.map((stage) => (
            <article
              key={stage.id}
              className={`benchmark-card ${learning?.current_stage === stage.id ? "is-current" : ""}`}
            >
              <span className="stage-index">{stage.title}</span>
              <p>{stage.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
