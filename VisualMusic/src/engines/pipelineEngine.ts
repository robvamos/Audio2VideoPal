import {
  startAudioStream,
  startVideoRender,
  stopAudioStream,
  stopVideoRender,
} from "../services/tauriApi";

export const pipelineEngine = {
  input: {
    start: startAudioStream,
    stop: stopAudioStream,
  },
  output: {
    start: startVideoRender,
    stop: stopVideoRender,
  },
};
