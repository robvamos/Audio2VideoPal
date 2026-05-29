import { useEffect, useState } from "react";
import ChooseStep from "./learning-lab/ChooseStep";
import CompareStep from "./learning-lab/CompareStep";
import { CONVERGENCE_STAGES, cycleIndex, FLOW_STEPS, type FlowStep } from "./learning-lab/constants";
import LearningStatusPanels from "./learning-lab/LearningStatusPanels";
import RateStep from "./learning-lab/RateStep";
import type { ListeningFileSourceConfig, ListeningTelemetry, TestSongDefinition } from "../types";

interface LearningLabPanelProps {
  fileSourceConfig: ListeningFileSourceConfig;
  telemetry: ListeningTelemetry | null;
  isBusy: boolean;
  onAdjustStructureLearning: (action: string) => Promise<void>;
  onRerunListeningTest: () => Promise<void>;
  onSaveLearningEvaluation: (songId: string, rating: string, note: string) => Promise<void>;
  onSaveFilterSetupEvaluation: (setupId: string, rating: string, note: string) => Promise<void>;
  onBindBenchmarkSongToCurrentFile: (songId: string) => Promise<void>;
  onLoadBenchmarkIntoFileSource: (song: TestSongDefinition) => void;
}

export default function LearningLabPanel({
  fileSourceConfig,
  telemetry,
  isBusy,
  onAdjustStructureLearning,
  onRerunListeningTest,
  onSaveLearningEvaluation,
  onSaveFilterSetupEvaluation,
  onBindBenchmarkSongToCurrentFile,
  onLoadBenchmarkIntoFileSource,
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

      <LearningStatusPanels telemetry={telemetry} />

      {activeStep === "choose" && (
        <ChooseStep
          songs={learning?.test_songs ?? []}
          setups={learning?.filter_setups ?? []}
          currentFilePath={fileSourceConfig.filePath}
          selectedSongId={selectedSongId}
          selectedSetupId={selectedSetupId}
          onSelectSong={setSelectedSongId}
          onSelectSetup={setSelectedSetupId}
          onStepSong={stepSong}
          onStepSetup={stepSetup}
          onBindSongToCurrentFile={onBindBenchmarkSongToCurrentFile}
          onLoadSongIntoFileSource={onLoadBenchmarkIntoFileSource}
        />
      )}

      {activeStep === "compare" && (
        <CompareStep
          comparison={comparison}
          selectedSong={selectedSong}
          isBusy={isBusy}
          onAdjustStructureLearning={onAdjustStructureLearning}
          onRerunListeningTest={onRerunListeningTest}
        />
      )}

      {activeStep === "rate" && (
        <RateStep
          selectedSong={selectedSong}
          selectedSetup={selectedSetup}
          ratingScale={learning?.rating_scale ?? []}
          evaluationHistory={learning?.evaluation_history ?? []}
          setupEvaluationHistory={learning?.setup_evaluation_history ?? []}
          selectedRating={selectedRating}
          note={note}
          setupRating={setupRating}
          setupNote={setupNote}
          isBusy={isBusy}
          canSaveSong={Boolean(selectedSongId && selectedRating)}
          canSaveSetup={Boolean(selectedSetupId && setupRating)}
          onSelectRating={setSelectedRating}
          onSelectSetupRating={setSetupRating}
          onNoteChange={setNote}
          onSetupNoteChange={setSetupNote}
          onSaveEvaluation={handleSaveEvaluation}
          onSaveSetupEvaluation={handleSaveSetupEvaluation}
        />
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
