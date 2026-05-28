import { useEffect, useState } from "react";
import FlowAnalyzerPanel from "./FlowAnalyzerPanel";
import { loadMapPuzzleState, saveMapPuzzleState } from "../services/tauriApi";
import type { ListeningTelemetry, MapPuzzleViewState } from "../types";

interface TechnicalMapPanelProps {
  telemetry: ListeningTelemetry | null;
}

const DEFAULT_VIEW_STATE: MapPuzzleViewState = {
  selectedSongId: "grid16_phrase_map",
  selectedSetupId: "phase_grid_focus",
  edgeFilter: "all",
  compareMode: "split",
  diagnosticsLens: "timing",
  memoryNote: "",
  analyzerTargetType: "module",
  analyzerTargetId: "tempo_autocorrelation",
  analyzerWindow: "medium",
};

function buildOrderedModules(edges: [string, string][]) {
  if (!edges.length) {
    return [];
  }

  const targets = new Set(edges.map(([, to]) => to));
  const starters = edges.map(([from]) => from).filter((from) => !targets.has(from));
  const start = starters[0] ?? edges[0][0];
  const ordered = [start];
  const visited = new Set<string>([start]);

  let cursor = start;
  while (true) {
    const nextEdge = edges.find(([from]) => from === cursor);
    if (!nextEdge) {
      break;
    }

    const next = nextEdge[1];
    if (visited.has(next)) {
      break;
    }

    ordered.push(next);
    visited.add(next);
    cursor = next;
  }

  return ordered;
}

function metricTone(value: number, warnAt: number, dangerAt: number) {
  if (value >= dangerAt) {
    return "danger";
  }
  if (value >= warnAt) {
    return "warning";
  }
  return "good";
}

export default function TechnicalMapPanel({ telemetry }: TechnicalMapPanelProps) {
  const [viewState, setViewState] = useState<MapPuzzleViewState>(DEFAULT_VIEW_STATE);
  const [didLoadState, setDidLoadState] = useState(false);
  const wiring = telemetry?.wiring;
  const comparison = telemetry?.learning.structure_comparison;
  const orderedModules = buildOrderedModules(wiring?.module_edges ?? []);
  const activeSet = new Set(wiring?.active_modules ?? []);
  const disabledSet = new Set(wiring?.disabled_modules ?? []);
  const selectedSong =
    telemetry?.learning.test_songs.find((song) => song.id === viewState.selectedSongId) ?? telemetry?.learning.test_songs[0] ?? null;
  const selectedSetup =
    telemetry?.learning.filter_setups.find((setup) => setup.id === viewState.selectedSetupId) ??
    telemetry?.learning.filter_setups[0] ??
    null;

  useEffect(() => {
    let cancelled = false;

    void loadMapPuzzleState().then((state) => {
      if (!cancelled) {
        setViewState({ ...DEFAULT_VIEW_STATE, ...state });
        setDidLoadState(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!didLoadState) {
      return;
    }

    void saveMapPuzzleState(viewState);
  }, [didLoadState, viewState]);

  useEffect(() => {
    if (!telemetry) {
      return;
    }

    setViewState((current) => ({
      ...current,
      selectedSongId: current.selectedSongId || telemetry.learning.test_songs[0]?.id || DEFAULT_VIEW_STATE.selectedSongId,
      selectedSetupId:
        current.selectedSetupId || telemetry.learning.filter_setups[0]?.id || DEFAULT_VIEW_STATE.selectedSetupId,
    }));
  }, [telemetry]);

  const architectureChecks = telemetry
    ? [
        {
          id: "timing",
          label: "Residual",
          value: `${(telemetry.preprocessing.residual_energy_ratio * 100).toFixed(1)}%`,
          tone: metricTone(telemetry.preprocessing.residual_energy_ratio, 0.28, 0.45),
          detail: "How much self-output still leaks into the listening path.",
        },
        {
          id: "timing",
          label: "Grid score",
          value: telemetry.one_bar_grid_score.toFixed(2),
          tone: telemetry.one_bar_grid_score < 0.7 ? "danger" : telemetry.one_bar_grid_score < 0.85 ? "warning" : "good",
          detail: "Overall one-bar reconstruction quality.",
        },
        {
          id: "reference",
          label: "Phase drift",
          value: comparison ? comparison.segment_offset_ratio.toFixed(3) : "--",
          tone: metricTone(Math.abs(comparison?.segment_offset_ratio ?? 0), 0.04, 0.1),
          detail: "How far the reconstructed map drifts left or right.",
        },
        {
          id: "reference",
          label: "Scale drift",
          value: comparison ? comparison.segment_scale_ratio.toFixed(3) : "--",
          tone: metricTone(Math.abs((comparison?.segment_scale_ratio ?? 1) - 1), 0.05, 0.12),
          detail: "How much segment widths stretch or compress.",
        },
        {
          id: "learning",
          label: "Learning stage",
          value: telemetry.learning.current_stage,
          tone: telemetry.learning.current_stage === "assertive" ? "good" : telemetry.learning.current_stage === "supporting" ? "live" : "warning",
          detail: "Current convergence stage of the learning path.",
        },
        {
          id: "learning",
          label: "Setup history",
          value: String(telemetry.learning.setup_evaluation_history.length),
          tone: telemetry.learning.setup_evaluation_history.length > 0 ? "good" : "warning",
          detail: "How many individual setup evaluations are already remembered.",
        },
      ]
    : [];

  const filteredChecks = architectureChecks.filter(
    (check) => viewState.diagnosticsLens === "timing" ? check.id === "timing" : viewState.diagnosticsLens === "reference" ? check.id === "reference" : check.id === "learning",
  );

  const breakpoints = telemetry
    ? [
        telemetry.preprocessing.self_reference_enabled
          ? null
          : "Reference path still missing: subtraction quality cannot be trusted yet.",
        telemetry.preprocessing.residual_energy_ratio > 0.35
          ? "Residual energy is still high: the self-output subtraction stage needs tuning."
          : null,
        comparison && Math.abs(comparison.segment_offset_ratio) > 0.05
          ? "Structure offset is visibly drifting: alignment is slipping before reconstruction."
          : null,
        comparison && Math.abs(comparison.segment_scale_ratio - 1) > 0.08
          ? "Structure width is unstable: segment duration learning is stretching or compressing too much."
          : null,
        wiring?.disabled_modules.includes("file_source")
          ? "Real file source is still out of chain: current map is only partially representative."
          : null,
      ].filter(Boolean)
    : [];

  const edgeRows =
    wiring?.module_edges.filter(([from, to]) => {
      const active = activeSet.has(from) && activeSet.has(to);
      if (viewState.edgeFilter === "active") {
        return active;
      }
      if (viewState.edgeFilter === "blocked") {
        return !active;
      }
      return true;
    }) ?? [];

  function updateViewState(patch: Partial<MapPuzzleViewState>) {
    setViewState((current) => ({ ...current, ...patch }));
  }

  function applyConfigPreset(preset: "timing" | "reference" | "learning") {
    const presets: Record<typeof preset, Partial<MapPuzzleViewState>> = {
      timing: { diagnosticsLens: "timing", edgeFilter: "active", compareMode: "split" },
      reference: { diagnosticsLens: "reference", edgeFilter: "all", compareMode: "overlay" },
      learning: { diagnosticsLens: "learning", edgeFilter: "blocked", compareMode: "split" },
    };

    updateViewState(presets[preset]);
  }

  function openAnalyzer(targetType: "module" | "edge", targetId: string) {
    updateViewState({
      analyzerTargetType: targetType,
      analyzerTargetId: targetId,
    });
  }

  return (
    <div className="studio-layout">
      <section className="studio-hero compact">
        <div>
          <p className="eyebrow">Debug Logica Ricostruzione Mappa</p>
          <h2>Vista tecnica del puzzle della mappa: pulsantiere, confronti, configurazioni e memoria persistente.</h2>
        </div>
      </section>

      <section className="studio-panel">
        <h3>Console tecnica</h3>
        <div className="technical-toolbar-grid">
          <div className="technical-control-block">
            <span className="technical-label">Preset</span>
            <div className="compact-pill-row">
              <button type="button" className="mini-pill" onClick={() => applyConfigPreset("timing")} title="Focus on timing and lock">
                Timing
              </button>
              <button type="button" className="mini-pill" onClick={() => applyConfigPreset("reference")} title="Focus on drift and segment reconstruction">
                Drift
              </button>
              <button type="button" className="mini-pill" onClick={() => applyConfigPreset("learning")} title="Focus on learning and blocked steps">
                Learning
              </button>
            </div>
          </div>

          <div className="technical-control-block">
            <span className="technical-label">Diagnostica</span>
            <div className="compact-pill-row">
              {[
                { id: "timing", label: "Timing" },
                { id: "reference", label: "Reference" },
                { id: "learning", label: "Learning" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`mini-pill ${viewState.diagnosticsLens === item.id ? "active" : ""}`}
                  onClick={() => updateViewState({ diagnosticsLens: item.id as MapPuzzleViewState["diagnosticsLens"] })}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="technical-control-block">
            <span className="technical-label">Archi</span>
            <div className="compact-pill-row">
              {[
                { id: "all", label: "All" },
                { id: "active", label: "Active" },
                { id: "blocked", label: "Blocked" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`mini-pill ${viewState.edgeFilter === item.id ? "active" : ""}`}
                  onClick={() => updateViewState({ edgeFilter: item.id as MapPuzzleViewState["edgeFilter"] })}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="technical-control-block">
            <span className="technical-label">Confronto</span>
            <div className="compact-pill-row">
              {[
                { id: "split", label: "Split" },
                { id: "overlay", label: "Overlay" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`mini-pill ${viewState.compareMode === item.id ? "active" : ""}`}
                  onClick={() => updateViewState({ compareMode: item.id as MapPuzzleViewState["compareMode"] })}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="evaluation-layout">
        <section className="studio-panel">
          <h3>Configurazione attiva</h3>
          <div className="technical-control-block">
            <span className="technical-label">Benchmark</span>
            <div className="compact-pill-row">
              {telemetry?.learning.test_songs.map((song) => (
                <button
                  key={song.id}
                  type="button"
                  className={`mini-pill ${viewState.selectedSongId === song.id ? "active" : ""}`}
                  onClick={() => updateViewState({ selectedSongId: song.id })}
                  title={song.focus}
                >
                  {song.id}
                </button>
              )) ?? <p>No benchmark song library yet.</p>}
            </div>
          </div>

          <div className="technical-control-block">
            <span className="technical-label">Setup</span>
            <div className="compact-pill-row">
              {telemetry?.learning.filter_setups.map((setup) => (
                <button
                  key={setup.id}
                  type="button"
                  className={`mini-pill ${viewState.selectedSetupId === setup.id ? "active" : ""}`}
                  onClick={() => updateViewState({ selectedSetupId: setup.id })}
                  title={setup.description}
                >
                  {setup.name}
                </button>
              )) ?? <p>No setup catalog yet.</p>}
            </div>
          </div>

          <div className="readiness-list">
            <div className="readiness-row">
              <span>Benchmark corrente</span>
              <strong>{selectedSong?.focus ?? "--"}</strong>
            </div>
            <div className="readiness-row">
              <span>Setup corrente</span>
              <strong>{selectedSetup?.name ?? "--"}</strong>
            </div>
            <div className="readiness-row">
              <span>Obiettivo</span>
              <strong>{selectedSetup?.goal ?? "--"}</strong>
            </div>
          </div>

          <div className="module-list">
            {selectedSetup?.modules.map((moduleName) => (
              <span key={moduleName} className="module-pill active">
                {moduleName}
              </span>
            )) ?? <p>No module focus yet.</p>}
          </div>
        </section>

        <section className="studio-panel">
          <h3>Memoria tecnica</h3>
          <label className="pipeline-control">
            <span>Nota persistente</span>
            <textarea
              className="learning-note"
              value={viewState.memoryNote}
              onChange={(event) => updateViewState({ memoryNote: event.target.value })}
              placeholder="Annota il puzzle attuale, i sospetti o la prossima prova da fare."
            />
          </label>
          <div className="readiness-list">
            <div className="readiness-row">
              <span>Persistenza</span>
              <strong>{didLoadState ? "attiva" : "caricamento"}</strong>
            </div>
            <div className="readiness-row">
              <span>Filtro archi</span>
              <strong>{viewState.edgeFilter}</strong>
            </div>
            <div className="readiness-row">
              <span>Modalita confronto</span>
              <strong>{viewState.compareMode}</strong>
            </div>
            <div className="readiness-row">
              <span>Analyzer</span>
              <strong>
                {viewState.analyzerTargetType
                  ? `${viewState.analyzerTargetType}:${viewState.analyzerTargetId}`
                  : "chiuso"}
              </strong>
            </div>
          </div>
        </section>
      </div>

      <section className="studio-panel">
        <h3>Architecture signal chain</h3>
        {orderedModules.length ? (
          <div className="chain-strip">
            {orderedModules.map((moduleName, index) => {
              const isActive = activeSet.has(moduleName);
              const isDisabled = disabledSet.has(moduleName);
              const isFocused = selectedSetup?.modules.includes(moduleName);

              return (
                <div
                  key={moduleName}
                  className={`chain-node ${isActive ? "active" : ""} ${isDisabled ? "disabled" : ""} ${isFocused ? "focused" : ""}`}
                >
                  <span className="chain-index">{index + 1}</span>
                  <strong>{moduleName}</strong>
                  <button
                    type="button"
                    className="mini-pill technical-action"
                    onClick={() => openAnalyzer("module", moduleName)}
                    title="Open flow analyzer for this module"
                  >
                    Scope
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p>No ordered chain available yet.</p>
        )}
      </section>

      <div className="studio-grid">
        <section className="studio-panel">
          <h3>Critical checks</h3>
          <div className="diagnostic-grid">
            {filteredChecks.length ? (
              filteredChecks.map((check) => (
                <div key={`${check.label}-${check.id}`} className={`diagnostic-card ${check.tone}`}>
                  <span>{check.label}</span>
                  <strong>{check.value}</strong>
                  <p>{check.detail}</p>
                </div>
              ))
            ) : (
              <p>No diagnostics captured yet.</p>
            )}
          </div>
        </section>

        <section className="studio-panel">
          <h3>Breakpoints</h3>
          <div className="recommendation-list">
            {breakpoints.length ? breakpoints.map((item) => <p key={item}>{item}</p>) : <p>No obvious breakpoint flagged.</p>}
          </div>
        </section>

        <section className="studio-panel">
          <h3>Runtime facts</h3>
          <div className="readiness-list">
            <div className="readiness-row">
              <span>Profile</span>
              <strong>{telemetry?.profile ?? "--"}</strong>
            </div>
            <div className="readiness-row">
              <span>Source</span>
              <strong>{telemetry?.source ?? "--"}</strong>
            </div>
            <div className="readiness-row">
              <span>Sync</span>
              <strong>{telemetry?.sync_state ?? "--"}</strong>
            </div>
            <div className="readiness-row">
              <span>Run</span>
              <strong>{telemetry?.run_id ?? "--"}</strong>
            </div>
          </div>
        </section>
      </div>

      <div className="evaluation-layout">
        <section className="studio-panel">
          <h3>Edge ledger</h3>
          {edgeRows.length ? (
            <div className="edge-ledger">
              {edgeRows.map(([from, to]) => {
                const active = activeSet.has(from) && activeSet.has(to);
                const focused = selectedSetup?.modules.includes(from) || selectedSetup?.modules.includes(to);

                return (
                  <div
                    key={`${from}-${to}`}
                    className={`edge-ledger-row ${active ? "active" : "blocked"} ${focused ? "focused" : ""}`}
                  >
                    <span>{from}</span>
                    <strong>→</strong>
                    <div className="edge-ledger-actions">
                      <span>{to}</span>
                      <button
                        type="button"
                        className="mini-pill technical-action"
                        onClick={() => openAnalyzer("edge", `${from} -> ${to}`)}
                        title="Open flow analyzer for this edge"
                      >
                        Flow
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p>No edge data available for this filter.</p>
          )}
        </section>

        <section className="studio-panel">
          <h3>Puzzle della mappa</h3>
          {comparison ? (
            <div className="map-puzzle-panel">
              <div className="map-puzzle-header">
                <span>Target {selectedSong?.id ?? comparison.target_label}</span>
                <strong>error {(comparison.average_error_ratio * 100).toFixed(1)}%</strong>
              </div>

              {viewState.compareMode === "split" ? (
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
      </div>

      {viewState.analyzerTargetType && viewState.analyzerTargetId && (
        <FlowAnalyzerPanel
          telemetry={telemetry}
          targetType={viewState.analyzerTargetType}
          targetId={viewState.analyzerTargetId}
          memoryWindow={viewState.analyzerWindow}
          onMemoryWindowChange={(value) => updateViewState({ analyzerWindow: value })}
          onClose={() => updateViewState({ analyzerTargetType: null, analyzerTargetId: "" })}
        />
      )}
    </div>
  );
}
