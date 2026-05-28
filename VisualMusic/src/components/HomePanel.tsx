import { useState } from "react";
import { systemEngine } from "../engines/systemEngine";

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
      <section className="overview-banner">
        <div>
          <p className="eyebrow">System Room</p>
          <h2>Keep environment setup and runtime diagnostics separate from the musical logic panels.</h2>
        </div>
      </section>
      <div className="row">
        <button onClick={() => handleAction(systemEngine.initDb)} disabled={isBusy}>
          Initialize Database
        </button>
        <button onClick={() => handleAction(systemEngine.detectFfmpeg)} disabled={isBusy}>
          Detect FFmpeg
        </button>
        <button onClick={() => handleAction(systemEngine.batchRenderTest)} disabled={isBusy}>
          Batch Render Test
        </button>
      </div>
      <p>This room is for environment readiness, not for timing or wiring decisions.</p>
    </div>
  );
}
