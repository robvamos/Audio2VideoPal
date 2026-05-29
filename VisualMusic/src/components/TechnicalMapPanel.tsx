import { useEffect, useState } from "react";
import FlowAnalyzerPanel from "./FlowAnalyzerPanel";
import { loadMapPuzzleState, saveMapPuzzleState } from "../services/tauriApi";
import type { ListeningTelemetry, MapPuzzleViewState } from "../types";
import TechnicalChainPanel from "./technical-map/TechnicalChainPanel";
import TechnicalComparisonPanel from "./technical-map/TechnicalComparisonPanel";
import TechnicalConfigurationPanel from "./technical-map/TechnicalConfigurationPanel";
import { buildOrderedModules, DEFAULT_MAP_PUZZLE_STATE, metricTone } from "./technical-map/defaults";
import TechnicalDiagnosticsPanel from "./technical-map/TechnicalDiagnosticsPanel";
import TechnicalEdgeLedgerPanel from "./technical-map/TechnicalEdgeLedgerPanel";
import TechnicalMemoryPanel from "./technical-map/TechnicalMemoryPanel";
import TechnicalToolbar from "./technical-map/TechnicalToolbar";

interface TechnicalMapPanelProps {
  telemetry: ListeningTelemetry | null;
}

export default function TechnicalMapPanel({ telemetry }: TechnicalMapPanelProps) {
  const [viewState, setViewState] = useState<MapPuzzleViewState>(DEFAULT_MAP_PUZZLE_STATE);
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
        setViewState({ ...DEFAULT_MAP_PUZZLE_STATE, ...state });
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
      selectedSongId: current.selectedSongId || telemetry.learning.test_songs[0]?.id || DEFAULT_MAP_PUZZLE_STATE.selectedSongId,
      selectedSetupId:
        current.selectedSetupId || telemetry.learning.filter_setups[0]?.id || DEFAULT_MAP_PUZZLE_STATE.selectedSetupId,
    }));
  }, [telemetry]);

  const architectureChecks = telemetry
    ? ([
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
      ] as const)
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
      ].filter((item): item is string => Boolean(item))
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

      <TechnicalToolbar
        viewState={viewState}
        onUpdateViewState={updateViewState}
        onApplyConfigPreset={applyConfigPreset}
      />

      <div className="evaluation-layout">
        <TechnicalConfigurationPanel
          songs={telemetry?.learning.test_songs ?? []}
          setups={telemetry?.learning.filter_setups ?? []}
          selectedSong={selectedSong}
          selectedSetup={selectedSetup}
          viewState={viewState}
          onUpdateViewState={updateViewState}
        />
        <TechnicalMemoryPanel
          didLoadState={didLoadState}
          viewState={viewState}
          onUpdateViewState={updateViewState}
        />
      </div>

      <TechnicalChainPanel
        orderedModules={orderedModules}
        activeSet={activeSet}
        disabledSet={disabledSet}
        focusedModules={selectedSetup?.modules ?? []}
        onOpenAnalyzer={openAnalyzer}
      />

      <TechnicalDiagnosticsPanel
        diagnostics={filteredChecks}
        breakpoints={breakpoints}
        profile={telemetry?.profile}
        source={telemetry?.source}
        syncState={telemetry?.sync_state}
        runId={telemetry?.run_id}
      />

      <div className="evaluation-layout">
        <TechnicalEdgeLedgerPanel
          edgeRows={edgeRows}
          activeSet={activeSet}
          focusedModules={selectedSetup?.modules ?? []}
          onOpenAnalyzer={openAnalyzer}
        />
        <TechnicalComparisonPanel
          comparison={comparison}
          compareMode={viewState.compareMode}
          selectedSong={selectedSong}
        />
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
