import type { MapPuzzleViewState } from "../../types";

export const DEFAULT_MAP_PUZZLE_STATE: MapPuzzleViewState = {
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

export function buildOrderedModules(edges: [string, string][]) {
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

export function metricTone(value: number, warnAt: number, dangerAt: number) {
  if (value >= dangerAt) {
    return "danger";
  }
  if (value >= warnAt) {
    return "warning";
  }
  return "good";
}
