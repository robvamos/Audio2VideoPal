import type { StructureComparison, TestSongDefinition } from "../../types";

interface TechnicalComparisonPanelProps {
  comparison: StructureComparison | null | undefined;
  compareMode: "split" | "overlay";
  selectedSong: TestSongDefinition | null;
}

export default function TechnicalComparisonPanel({
  comparison,
  compareMode,
  selectedSong,
}: TechnicalComparisonPanelProps) {
  return (
    <section className="studio-panel">
      <h3>Puzzle della mappa</h3>
      {comparison ? (
        <div className="map-puzzle-panel">
          <div className="map-puzzle-header">
            <span>Target {selectedSong?.id ?? comparison.target_label}</span>
            <strong>error {(comparison.average_error_ratio * 100).toFixed(1)}%</strong>
          </div>

          {compareMode === "split" ? (
            <>
              <div className="structure-track-card compact">
                <span className="structure-track-label">Reference</span>
                <div className="structure-track">
                  {comparison.reference_segments.map((segment) => (
                    <div
                      key={`tech-ref-${segment.label}-${segment.start_ratio}`}
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
              <div className="structure-track-card compact">
                <span className="structure-track-label">Reconstruction</span>
                <div className="structure-track">
                  {comparison.reconstructed_segments.map((segment) => (
                    <div
                      key={`tech-recon-${segment.label}-${segment.start_ratio}`}
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
            </>
          ) : (
            <div className="structure-track-card compact">
              <span className="structure-track-label">Overlay reference vs reconstruction</span>
              <div className="structure-track overlay">
                {comparison.reference_segments.map((segment) => (
                  <div
                    key={`overlay-ref-${segment.label}-${segment.start_ratio}`}
                    className="structure-segment reference overlay"
                    style={{
                      left: `${segment.start_ratio * 100}%`,
                      width: `${(segment.end_ratio - segment.start_ratio) * 100}%`,
                    }}
                    title={`Reference ${segment.label}`}
                  >
                    <span>{segment.label}</span>
                  </div>
                ))}
                {comparison.reconstructed_segments.map((segment) => (
                  <div
                    key={`overlay-recon-${segment.label}-${segment.start_ratio}`}
                    className="structure-segment reconstructed overlay"
                    style={{
                      left: `${segment.start_ratio * 100}%`,
                      width: `${(segment.end_ratio - segment.start_ratio) * 100}%`,
                    }}
                    title={`Reconstruction ${segment.label}`}
                  >
                    <span>{segment.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p>No segment map available yet.</p>
      )}
    </section>
  );
}
