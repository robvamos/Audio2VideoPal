import { useEffect, useState } from "react";
import type { ListeningTelemetry } from "../types";

interface LearningLabPanelProps {
  telemetry: ListeningTelemetry | null;
  isBusy: boolean;
  onAdjustStructureLearning: (action: string) => Promise<void>;
  onRerunListeningTest: () => Promise<void>;
  onSaveLearningEvaluation: (songId: string, rating: string, note: string) => Promise<void>;
  onSaveFilterSetupEvaluation: (setupId: string, rating: string, note: string) => Promise<void>;
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

function cycleIndex(currentIndex: number, length: number, delta: number) {
  if (length <= 0) {
    return 0;
  }

  return (currentIndex + delta + length) % length;
}

export default function LearningLabPanel({
  telemetry,
  isBusy,
  onAdjustStructureLearning,
  onRerunListeningTest,
  onSaveLearningEvaluation,
  onSaveFilterSetupEvaluation,
}: LearningLabPanelProps) {
  const learning = telemetry?.learning;
  const comparison = learning?.structure_comparison;
  const [activeStep, setActiveStep] = useState<FlowStep>("choose");
  const [selectedSongId, setSelectedSongId] = useState("");
  const [selectedSetupId, setSelectedSetupId] = useState("");
  const [selectedRating, setSelectedRating] = useState("");
  const [note, setNote] = useState("");
  const [setupRating, setSetupRating] = useState("");
  const [setupNote, setSetupNote] = useState("");

  useEffect(() => {
    if (!selectedSongId && learning?.test_songs[0]) {
      setSelectedSongId(learning.test_songs[0].id);
    }
    if (!selectedSetupId && learning?.filter_setups[0]) {
      setSelectedSetupId(learning.filter_setups[0].id);
    }
    if (!selectedRating && learning?.rating_scale[0]) {
      setSelectedRating(learning.rating_scale[0]);
    }
    if (!setupRating && learning?.rating_scale[0]) {
      setSetupRating(learning.rating_scale[0]);
    }
  }, [learning, selectedRating, selectedSetupId, selectedSongId, setupRating]);

  const selectedSong = learning?.test_songs.find((song) => song.id === selectedSongId) ?? learning?.test_songs[0] ?? null;
  const selectedSetup =
    learning?.filter_setups.find((setup) => setup.id === selectedSetupId) ?? learning?.filter_setups[0] ?? null;
  const songIndex = learning?.test_songs.findIndex((song) => song.id === selectedSongId) ?? -1;
  const setupIndex = learning?.filter_setups.findIndex((setup) => setup.id === selectedSetupId) ?? -1;

  async function handleSaveEvaluation() {
    if (!selectedSongId || !selectedRating) {
      return;
    }
    await onSaveLearningEvaluation(selectedSongId, selectedRating, note);
    setNote("");
  }

  async function handleSaveSetupEvaluation() {
    if (!selectedSetupId || !setupRating) {
      return;
    }
    await onSaveFilterSetupEvaluation(selectedSetupId, setupRating, setupNote);
    setSetupNote("");
  }

  function stepSong(delta: number) {
    if (!learning?.test_songs.length) {
      return;
    }

    const nextIndex = cycleIndex(songIndex >= 0 ? songIndex : 0, learning.test_songs.length, delta);
    setSelectedSongId(learning.test_songs[nextIndex].id);
  }

  function stepSetup(delta: number) {
    if (!learning?.filter_setups.length) {
      return;
    }

    const nextIndex = cycleIndex(setupIndex >= 0 ? setupIndex : 0, learning.filter_setups.length, delta);
    setSelectedSetupId(learning.filter_setups[nextIndex].id);
  }

  const compareActions = [
    { action: "shift_left", label: "<<", hint: "Move reconstruction earlier" },
    { action: "shift_right", label: ">>", hint: "Move reconstruction later" },
    { action: "compress", label: "-|", hint: "Compress segment widths" },
    { action: "expand", label: "|+", hint: "Expand segment widths" },
    { action: "reset", label: "R", hint: "Reset learned corrections" },
  ];

  return (
    <div className="studio-layout">
      <section className="studio-hero compact">
        <div>
          <p className="eyebrow">Learning Lab</p>
          <h2>Fast selection, quick visual compare, lightweight rating.</h2>
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
          <h3>Choose</h3>
          <div className="evaluation-layout">
            <div className="compact-selector-card">
              <div className="compact-selector-head">
                <h4>Benchmark</h4>
                <div className="compact-selector-actions">
                  <button type="button" className="icon-button" onClick={() => stepSong(-1)} title="Previous benchmark">
                    {"<"}
                  </button>
                  <button type="button" className="icon-button" onClick={() => stepSong(1)} title="Next benchmark">
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
                  <div className="compact-pill-row">
                    {learning?.test_songs.map((song) => (
                      <button
                        key={song.id}
                        type="button"
                        className={`mini-pill ${selectedSongId === song.id ? "active" : ""}`}
                        onClick={() => setSelectedSongId(song.id)}
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
                  <button type="button" className="icon-button" onClick={() => stepSetup(-1)} title="Previous setup">
                    {"<"}
                  </button>
                  <button type="button" className="icon-button" onClick={() => stepSetup(1)} title="Next setup">
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
                    {learning?.filter_setups.map((setup) => (
                      <button
                        key={setup.id}
                        type="button"
                        className={`mini-pill ${selectedSetupId === setup.id ? "active" : ""}`}
                        onClick={() => setSelectedSetupId(setup.id)}
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
      )}

      {activeStep === "compare" && (
        <section className="studio-panel">
          <h3>Compare</h3>

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

                <div className="compact-toolbar" aria-label="Structure correction tools">
                  {compareActions.map((item) => (
                    <button
                      key={item.action}
                      type="button"
                      className="icon-button"
                      onClick={() => void onAdjustStructureLearning(item.action)}
                      disabled={isBusy}
                      title={item.hint}
                    >
                      {item.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="icon-button icon-button-accent"
                    onClick={() => void onRerunListeningTest()}
                    disabled={isBusy}
                    title="Rebuild with current learned settings"
                  >
                    Go
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
          <h3>Rate</h3>
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
                <span title="Optional short note">Note</span>
                <textarea
                  className="learning-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Quick reason"
                />
              </label>
              <div className="pipeline-actions">
                <button onClick={() => void handleSaveEvaluation()} disabled={isBusy || !selectedSongId || !selectedRating}>
                  Save
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
                {learning?.rating_scale.map((rating) => (
                  <button
                    key={`setup-${rating}`}
                    type="button"
                    className={`rating-pill ${setupRating === rating ? "active" : ""}`}
                    onClick={() => setSetupRating(rating)}
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
                  onChange={(event) => setSetupNote(event.target.value)}
                  placeholder="Quick behavior note"
                />
              </label>
              <div className="pipeline-actions">
                <button
                  onClick={() => void handleSaveSetupEvaluation()}
                  disabled={isBusy || !selectedSetupId || !setupRating}
                >
                  Save Setup
                </button>
              </div>
            </div>

            <div className="evaluation-history">
              <h4>Recent setup evaluations</h4>
              <div className="recommendation-list">
                {learning?.setup_evaluation_history.length ? (
                  learning.setup_evaluation_history.map((entry) => (
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
