import { useState } from "react";
import {
  startAudioStream,
  stopAudioStream,
  startVideoRender,
  stopVideoRender,
} from "../services/tauriApi";

interface AudioVideoPipelineProps {
  onMessage: (value: string) => void;
}

export default function AudioVideoPipeline({ onMessage }: AudioVideoPipelineProps) {
  const [audioActive, setAudioActive] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  async function toggleAudio() {
    try {
      setIsBusy(true);
      const result = audioActive ? await stopAudioStream() : await startAudioStream();
      setAudioActive(!audioActive);
      onMessage(result);
    } catch (error) {
      onMessage(`Error: ${error}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function toggleVideo() {
    try {
      setIsBusy(true);
      const result = videoActive ? await stopVideoRender() : await startVideoRender();
      setVideoActive(!videoActive);
      onMessage(result);
    } catch (error) {
      onMessage(`Error: ${error}`);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="pipeline-grid">
      <div className="pipeline-panel">
        <h2>Audio Input Stream</h2>
        <p>Separating the audio capture pipeline ensures low-latency listening and allows independent tuning.</p>
        <button onClick={toggleAudio} disabled={isBusy}>
          {audioActive ? "Stop Audio Capture" : "Start Audio Capture"}
        </button>
        <p>Status: {audioActive ? "Running" : "Stopped"}</p>
      </div>

      <div className="pipeline-panel">
        <h2>Video Production Pipeline</h2>
        <p>Keeping the video render path separate improves resiliency and lets the UI remain responsive during export.</p>
        <button onClick={toggleVideo} disabled={isBusy}>
          {videoActive ? "Stop Video Render" : "Start Video Render"}
        </button>
        <p>Status: {videoActive ? "Active" : "Idle"}</p>
      </div>
    </div>
  );
}
