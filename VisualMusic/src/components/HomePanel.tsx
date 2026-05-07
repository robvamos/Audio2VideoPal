import { useState } from "react";
import { batchRenderTest, detectFfmpeg, initDb } from "../services/tauriApi";

interface HomePanelProps {
  setMessage: (value: string) => void;
}

export default function HomePanel({ setMessage }: HomePanelProps) {
  const [isBusy, setIsBusy] = useState(false);

  async function handleAction(action: () => Promise<string>) {
    try {
      setIsBusy(true);
      const result = await action();
      setMessage(result);
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="tab-content">
      <div className="row">
        <button onClick={() => handleAction(initDb)} disabled={isBusy}>
          Initialize Database
        </button>
        <button onClick={() => handleAction(detectFfmpeg)} disabled={isBusy}>
          Detect FFmpeg
        </button>
        <button onClick={() => handleAction(batchRenderTest)} disabled={isBusy}>
          Batch Render Test
        </button>
      </div>
      <p>
        This panel keeps system initialization and runtime diagnostics separate from plugin management and media pipelines.
      </p>
    </div>
  );
}
