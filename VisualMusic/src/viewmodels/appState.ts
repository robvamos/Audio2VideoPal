import type { AppStateItem, AppStateSummary, ListeningTelemetry, TimingState } from "../types";

interface DeriveAppStateOptions {
  audioActive: boolean;
  videoActive: boolean;
  isBusy: boolean;
  telemetry: ListeningTelemetry | null;
  timingState: TimingState | null;
}

function classifyLockState(telemetry: ListeningTelemetry | null) {
  if (!telemetry) {
    return {
      value: "No signal",
      detail: "No timing snapshot available yet.",
      tone: "neutral" as const,
    };
  }

  if (telemetry.one_bar_grid_score >= 0.85 && telemetry.bpm_confidence >= 0.85) {
    return {
      value: "Locked",
      detail: "Timing and grid quality look stable enough for downstream modules.",
      tone: "good" as const,
    };
  }

  if (telemetry.one_bar_grid_score >= 0.65 && telemetry.bpm_confidence >= 0.65) {
    return {
      value: "Aligning",
      detail: "The listening core is converging but not yet fully trustworthy.",
      tone: "warning" as const,
    };
  }

  return {
    value: "Unstable",
    detail: "Grid and confidence are still too weak for assertive behavior.",
    tone: "danger" as const,
  };
}

function classifyReferenceState(telemetry: ListeningTelemetry | null) {
  if (!telemetry) {
    return {
      value: "Unknown",
      detail: "Reference subtraction has not been evaluated yet.",
      tone: "neutral" as const,
    };
  }

  if (!telemetry.preprocessing.self_reference_enabled) {
    return {
      value: "Missing",
      detail: "Self-output reference path is not enabled.",
      tone: "danger" as const,
    };
  }

  if (telemetry.preprocessing.residual_energy_ratio <= 0.28) {
    return {
      value: "Clean",
      detail: "Reference subtraction is keeping residual bleed low.",
      tone: "good" as const,
    };
  }

  if (telemetry.preprocessing.residual_energy_ratio <= 0.45) {
    return {
      value: "Noisy",
      detail: "Subtraction is active but residual bleed is still noticeable.",
      tone: "warning" as const,
    };
  }

  return {
    value: "Leaking",
    detail: "Residual bleed is too high and may distort learning decisions.",
    tone: "danger" as const,
  };
}

function classifyLearningState(telemetry: ListeningTelemetry | null) {
  const stage = telemetry?.learning.current_stage ?? "unknown";

  switch (stage) {
    case "assertive":
      return {
        value: "Assertive",
        detail: "The system is allowed to respond with richer musical confidence.",
        tone: "good" as const,
      };
    case "supporting":
      return {
        value: "Supporting",
        detail: "The system can add support while still respecting timing evidence.",
        tone: "live" as const,
      };
    case "aligning":
      return {
        value: "Aligning",
        detail: "Learning is still converging around beat-1 and phrase structure.",
        tone: "warning" as const,
      };
    case "listening":
      return {
        value: "Listening",
        detail: "The system is still observing before it becomes musically active.",
        tone: "neutral" as const,
      };
    default:
      return {
        value: "Unknown",
        detail: "No learning stage has been reported yet.",
        tone: "neutral" as const,
      };
  }
}

export function deriveAppStateSummary({
  audioActive,
  videoActive,
  isBusy,
  telemetry,
  timingState,
}: DeriveAppStateOptions): AppStateSummary {
  const isPreview = telemetry?.status === "preview_complete";
  const lockState = classifyLockState(telemetry);
  const referenceState = classifyReferenceState(telemetry);
  const learningState = classifyLearningState(telemetry);
  const videoReady = Boolean(
    telemetry &&
      telemetry.one_bar_grid_score >= 0.8 &&
      telemetry.bpm_confidence >= 0.8 &&
      telemetry.preprocessing.self_reference_enabled,
  );

  const states: AppStateItem[] = [
    {
      id: "runtime",
      label: "Runtime",
      value: isPreview ? "Preview" : audioActive ? "Listening" : isBusy ? "Transition" : "Idle",
      detail: isPreview
        ? "UI is running with deterministic preview telemetry."
        : audioActive
          ? "Listening engine is active."
          : isBusy
            ? "A state transition is in progress."
            : "The listening engine is currently stopped.",
      tone: isPreview ? "warning" : audioActive ? "live" : isBusy ? "warning" : "neutral",
      active: audioActive || isPreview || isBusy,
    },
    {
      id: "lock",
      label: "Lock",
      value: lockState.value,
      detail: lockState.detail,
      tone: lockState.tone,
      active: telemetry?.one_bar_grid_score !== undefined,
    },
    {
      id: "reference",
      label: "Reference",
      value: referenceState.value,
      detail: referenceState.detail,
      tone: referenceState.tone,
      active: Boolean(telemetry),
    },
    {
      id: "learning",
      label: "Learning",
      value: learningState.value,
      detail: learningState.detail,
      tone: learningState.tone,
      active: Boolean(telemetry?.learning.current_stage),
    },
    {
      id: "video",
      label: "Video",
      value: videoActive ? "Rendering" : videoReady ? "Ready" : "Blocked",
      detail: videoActive
        ? "The visual output path is active."
        : videoReady
          ? "The timing core is strong enough to enable the visual side."
          : "The visual output should stay gated until timing reliability improves.",
      tone: videoActive ? "live" : videoReady ? "good" : "warning",
      active: videoActive || videoReady,
    },
  ];

  const hasCriticalIssue = states.some((state) => state.tone === "danger");
  const hasWarnings = states.some((state) => state.tone === "warning");

  let mode = "idle";
  let headline = "Listening core parked";
  let detail = "Pick a source and start a run when you want a fresh timing snapshot.";
  let primaryBadge = "Idle";
  let primaryTone: AppStateSummary["primaryTone"] = "neutral";
  let secondaryBadge = timingState?.sync_state ?? "No sync";
  let secondaryTone: AppStateSummary["secondaryTone"] = "neutral";

  if (isPreview) {
    mode = "preview";
    headline = "Preview mode active";
    detail = "The interface is showing seeded telemetry so we can shape the UI before running the desktop engine.";
    primaryBadge = "Preview";
    primaryTone = "warning";
    secondaryBadge = lockState.value;
    secondaryTone = lockState.tone;
  } else if (isBusy) {
    mode = "transition";
    headline = "State transition in progress";
    detail = "The app is starting, stopping or updating the listening pipeline.";
    primaryBadge = "Busy";
    primaryTone = "warning";
    secondaryBadge = audioActive ? "Listening" : "Switching";
    secondaryTone = "live";
  } else if (videoActive) {
    mode = "rendering";
    headline = "Listening and video are both active";
    detail = "The timing engine is live and the visual output path is currently rendering.";
    primaryBadge = "Rendering";
    primaryTone = "live";
    secondaryBadge = lockState.value;
    secondaryTone = lockState.tone;
  } else if (audioActive && videoReady) {
    mode = "ready_for_video";
    headline = "Listening is stable and the visual path can be enabled";
    detail = "The timing core looks coherent enough to wake up the visual side when desired.";
    primaryBadge = "Video Ready";
    primaryTone = "good";
    secondaryBadge = learningState.value;
    secondaryTone = learningState.tone;
  } else if (audioActive) {
    mode = hasCriticalIssue ? "attention" : "listening";
    headline = hasCriticalIssue ? "Listening active, but attention is needed" : "Listening core active";
    detail = hasCriticalIssue
      ? "At least one subsystem is still unstable and should be corrected before downstream expansion."
      : "The listening engine is running and still building evidence.";
    primaryBadge = hasCriticalIssue ? "Attention" : "Listening";
    primaryTone = hasCriticalIssue ? "danger" : "live";
    secondaryBadge = lockState.value;
    secondaryTone = lockState.tone;
  } else if (hasWarnings) {
    mode = "stale_warning";
    headline = "Last snapshot still shows open issues";
    detail = "The engine is idle, but the last captured telemetry still points to unresolved risks.";
    primaryBadge = "Review";
    primaryTone = "warning";
    secondaryBadge = referenceState.value;
    secondaryTone = referenceState.tone;
  }

  return {
    mode,
    headline,
    detail,
    primaryBadge,
    primaryTone,
    secondaryBadge,
    secondaryTone,
    states,
  };
}
