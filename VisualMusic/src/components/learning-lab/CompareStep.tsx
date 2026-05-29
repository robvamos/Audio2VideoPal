import type { StructureComparison, TestSongDefinition } from "../../types";
import { COMPARE_ACTIONS } from "./constants";

interface CompareStepProps {
  comparison: StructureComparison | null | undefined;
  selectedSong: TestSongDefinition | null;
  isBusy: boolean;
  onAdjustStructureLearning: (action: string) => Promise<void>;
  onRerunListeningTest: () => Promise<void>;
  onRunBenchmarkListeningTest: (songId: string) => Promise<void>;
}

export default function CompareStep({
  comparison,
  selectedSong,
  isBusy,
  onAdjustStructureLearning,
  onRerunListeningTest,
  onRunBenchmarkListeningTest,
}: CompareStepProps) {
  return (
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
              {COMPARE_ACTIONS.map((item) => (
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
              <button
                type="button"
                className="icon-button icon-button-accent"
                onClick={() => selectedSong && void onRunBenchmarkListeningTest(selectedSong.id)}
                disabled={isBusy || !selectedSong?.file_path}
                title={selectedSong?.file_path ? "Run this benchmark on its saved file" : "Bind a file to this benchmark first"}
              >
                Run
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
  );
}
