import type { FlowProbeTelemetry, ListeningTelemetry } from "../types";

interface FlowAnalyzerPanelProps {
  telemetry: ListeningTelemetry | null;
  targetType: "module" | "edge";
  targetId: string;
  memoryWindow: "short" | "medium" | "long";
  onMemoryWindowChange: (value: "short" | "medium" | "long") => void;
  onClose: () => void;
}

const WINDOW_META = {
  short: { samples: 24, seconds: "2.5s" },
  medium: { samples: 40, seconds: "5s" },
  long: { samples: 64, seconds: "9s" },
} as const;

function hashValue(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function buildFallbackTrace(telemetry: ListeningTelemetry | null, targetId: string, memoryWindow: "short" | "medium" | "long") {
  const { samples } = WINDOW_META[memoryWindow];
  const base = hashValue(targetId);
  const bpmFactor = (telemetry?.fused_bpm ?? 112) / 120;
  const gridFactor = telemetry?.one_bar_grid_score ?? 0.8;
  const phaseFactor = Math.abs(telemetry?.learning.structure_comparison.segment_offset_ratio ?? 0.03);

  return Array.from({ length: samples }, (_, index) => {
    const x = index / Math.max(1, samples - 1);
    const wave =
      0.5 +
      Math.sin((x * Math.PI * 2 * bpmFactor) + (base % 17)) * 0.26 +
      Math.cos((x * Math.PI * 6) + (base % 11)) * 0.12 -
      phaseFactor * 0.4;
    const pulseBoost = index % Math.max(3, Math.round(8 - gridFactor * 4)) === 0 ? 0.18 : 0;
    return Math.max(0.08, Math.min(0.96, wave + pulseBoost));
  });
}

function resizeTrace(samples: number[], count: number) {
  if (samples.length === count) {
    return samples;
  }

  return Array.from({ length: count }, (_, index) => {
    const sourceIndex = Math.round((index / Math.max(1, count - 1)) * Math.max(0, samples.length - 1));
    return samples[sourceIndex] ?? 0;
  });
}

function findProbe(
  telemetry: ListeningTelemetry | null,
  targetType: "module" | "edge",
  targetId: string,
): FlowProbeTelemetry | null {
  return (
    telemetry?.module_probes.find((probe) => probe.target_type === targetType && probe.target_id === targetId) ??
    null
  );
}

function buildHitIndexes(trace: number[]) {
  return trace
    .map((value, index) => ({ value, index }))
    .filter((item, index, items) => item.value > 0.72 && (index === 0 || item.value >= items[index - 1].value))
    .map((item) => item.index);
}

export default function FlowAnalyzerPanel({
  telemetry,
  targetType,
  targetId,
  memoryWindow,
  onMemoryWindowChange,
  onClose,
}: FlowAnalyzerPanelProps) {
  const probe = findProbe(telemetry, targetType, targetId);
  const trace = probe
    ? resizeTrace(probe.samples, WINDOW_META[memoryWindow].samples)
    : buildFallbackTrace(telemetry, targetId, memoryWindow);
  const hitIndexes = buildHitIndexes(trace);
  const peak = Math.max(...trace);
  const floor = Math.min(...trace);
  const average = trace.reduce((sum, value) => sum + value, 0) / trace.length;
  const points = trace
    .map((value, index) => {
      const x = (index / Math.max(1, trace.length - 1)) * 100;
      const y = 100 - value * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <aside className="flow-analyzer-floating">
      <div className="flow-analyzer-head">
        <div>
          <p className="eyebrow">Flow Analyzer</p>
          <h3>{targetType === "module" ? targetId : `edge ${targetId}`}</h3>
        </div>
        <button type="button" className="icon-button" onClick={onClose} title="Close analyzer">
          ×
        </button>
      </div>

      <div className="compact-pill-row">
        {(["short", "medium", "long"] as const).map((windowId) => (
          <button
            key={windowId}
            type="button"
            className={`mini-pill ${memoryWindow === windowId ? "active" : ""}`}
            onClick={() => onMemoryWindowChange(windowId)}
          >
            {windowId}
          </button>
        ))}
      </div>

      <div className="flow-analyzer-meta">
        <div>
          <span>Memory</span>
          <strong>{WINDOW_META[memoryWindow].seconds}</strong>
        </div>
        <div>
          <span>Signal</span>
          <strong>{probe?.signal_kind ?? "fallback"}</strong>
        </div>
        <div>
          <span>Peak</span>
          <strong>{peak.toFixed(2)}</strong>
        </div>
        <div>
          <span>Floor</span>
          <strong>{floor.toFixed(2)}</strong>
        </div>
        <div>
          <span>Mean</span>
          <strong>{average.toFixed(2)}</strong>
        </div>
      </div>

      <div className="flow-analyzer-chart">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Signal trace">
          <polyline className="flow-trace-line" points={points} />
          {hitIndexes.map((index) => {
            const x = (index / Math.max(1, trace.length - 1)) * 100;
            return <line key={index} className="flow-hit-line" x1={x} x2={x} y1="0" y2="100" />;
          })}
        </svg>
      </div>

      <div className="readiness-list">
        <div className="readiness-row">
          <span>Hits</span>
          <strong>{hitIndexes.length}</strong>
        </div>
        <div className="readiness-row">
          <span>Sync</span>
          <strong>{telemetry?.sync_state ?? "--"}</strong>
        </div>
        <div className="readiness-row">
          <span>Context</span>
          <strong>{targetType}</strong>
        </div>
        <div className="readiness-row">
          <span>Source</span>
          <strong>{probe ? "probe" : "fallback"}</strong>
        </div>
      </div>
    </aside>
  );
}
