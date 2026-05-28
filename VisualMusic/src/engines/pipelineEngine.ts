import {
  adjustStructureLearning,
  getLatestTelemetry,
  getLatestTimingState,
  runListeningTest,
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
    adjustStructureLearning,
  },
  output: {
    start: startVideoRender,
    stop: stopVideoRender,
  },
};
