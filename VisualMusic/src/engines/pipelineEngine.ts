import {
  adjustStructureLearning,
  getLatestTelemetry,
  loadFileSourceConfig,
  getLatestTimingState,
  runListeningTest,
  saveFilterSetupEvaluation,
  saveFileSourceConfig,
  saveLearningEvaluation,
  startAudioStream,
  startListeningPipeline,
  startVideoRender,
  stopListeningPipeline,
  stopAudioStream,
  stopVideoRender,
} from "../services/tauriApi";

export const pipelineEngine = {
  input: {
    start: startAudioStream,
    stop: stopAudioStream,
  },
  listening: {
    start: startListeningPipeline,
    stop: stopListeningPipeline,
    runTest: runListeningTest,
    getLatestTimingState,
    getLatestTelemetry,
    loadFileSourceConfig,
    saveFileSourceConfig,
    adjustStructureLearning,
    saveLearningEvaluation,
    saveFilterSetupEvaluation,
  },
  output: {
    start: startVideoRender,
    stop: stopVideoRender,
  },
};
