export const CONVERGENCE_STAGES = [
  {
    id: "listening",
    title: "Listening",
    description: "Observe, align and avoid premature musical expansion.",
  },
  {
    id: "aligning",
    title: "Aligning",
    description: "Support cautiously while BPM and beat-1 evidence are still settling.",
  },
  {
    id: "supporting",
    title: "Supporting",
    description: "Increase musical presence only after stable lock and structure confidence.",
  },
  {
    id: "assertive",
    title: "Assertive",
    description: "Allow richer response only when the system keeps reliable timing and phase.",
  },
] as const;

export const FLOW_STEPS = [
  { id: "choose", label: "1. Choose" },
  { id: "compare", label: "2. Compare" },
  { id: "rate", label: "3. Rate" },
] as const;

export type FlowStep = (typeof FLOW_STEPS)[number]["id"];

export const COMPARE_ACTIONS = [
  { action: "shift_left", label: "<<", hint: "Move reconstruction earlier" },
  { action: "shift_right", label: ">>", hint: "Move reconstruction later" },
  { action: "compress", label: "-|", hint: "Compress segment widths" },
  { action: "expand", label: "|+", hint: "Expand segment widths" },
  { action: "reset", label: "R", hint: "Reset learned corrections" },
] as const;

export function cycleIndex(currentIndex: number, length: number, delta: number) {
  if (length <= 0) {
    return 0;
  }

  return (currentIndex + delta + length) % length;
}
