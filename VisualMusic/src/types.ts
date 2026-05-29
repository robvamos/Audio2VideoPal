export interface Plugin {
  id: number;
  file_name: string;
  file_path: string;
  architecture: string;
  file_size_bytes: number;
  sha256: string;
  deep_scan_status: string;
  deep_scan_completed_at: string | null;
}

export interface ScanDetails {
  timestamp: string;
  machine_type: string;
  bitness: string;
  is_dll: boolean;
  raw_scan: unknown;
}

export interface TimingState {
  sync_state: string;
  bpm: number | null;
  meter: string;
  bar: number | null;
  beat_in_bar: number | null;
  next_beat_sec: number | null;
  next_downbeat_sec: number | null;
  tempo_confidence: number;
  phase_confidence: number;
  downbeat_confidence: number;
}

export interface OneBarGridResult {
  beat_labels: number[];
  current_beat: number;
  one_bar_grid_score: number;
  bpm_confidence: number;
  downbeat_error_ms: number;
}

export interface WiringDescription {
  profile: string;
  active_modules: string[];
  disabled_modules: string[];
  module_edges: [string, string][];
}

export interface FlowProbeTelemetry {
  target_type: "module" | "edge";
  target_id: string;
  display_name: string;
  signal_kind: string;
  samples: number[];
  hit_indexes: number[];
  memory_sec: number;
}

export interface PreprocessingTelemetry {
  self_reference_enabled: boolean;
  reference_mix_ratio: number;
  residual_energy_ratio: number;
  cancellation_db: number;
  latency_alignment_ms: number;
}

export interface TestSongDefinition {
  id: string;
  focus: string;
  expected_outcome: string;
}

export interface StructureSegment {
  label: string;
  start_ratio: number;
  end_ratio: number;
}

export interface StructureComparison {
  target_label: string;
  average_error_ratio: number;
  segment_offset_ratio: number;
  segment_scale_ratio: number;
  reference_segments: StructureSegment[];
  reconstructed_segments: StructureSegment[];
}

export interface LearningEvaluationEntry {
  timestamp: string;
  song_id: string;
  rating: string;
  note: string;
  average_error_ratio: number;
  segment_offset_ratio: number;
  segment_scale_ratio: number;
}

export interface FilterSetupDefinition {
  id: string;
  name: string;
  description: string;
  goal: string;
  modules: string[];
}

export interface FilterSetupEvaluationEntry {
  timestamp: string;
  setup_id: string;
  rating: string;
  note: string;
  goal: string;
}

export interface LearningTelemetry {
  current_stage: string;
  rating_scale: string[];
  test_songs: TestSongDefinition[];
  filter_setups: FilterSetupDefinition[];
  structure_comparison: StructureComparison;
  evaluation_history: LearningEvaluationEntry[];
  setup_evaluation_history: FilterSetupEvaluationEntry[];
  next_milestones: string[];
}

export interface ListeningTelemetry {
  run_id: string;
  profile: string;
  source: string;
  status: string;
  fused_bpm: number;
  bpm_confidence: number;
  sync_state: string;
  downbeat_confidence: number;
  one_bar_grid_score: number;
  preprocessing: PreprocessingTelemetry;
  learning: LearningTelemetry;
  wiring: WiringDescription;
  module_probes: FlowProbeTelemetry[];
  recommendations: string[];
  telemetry_json_path: string;
  telemetry_summary_path: string;
}

export interface ListeningRunResult {
  timing_state: TimingState;
  one_bar_grid: OneBarGridResult;
  telemetry: ListeningTelemetry;
}

export interface ListeningTimingSnapshot {
  timingState: TimingState | null;
  telemetry: ListeningTelemetry | null;
}

export type AppStateTone = "neutral" | "good" | "warning" | "danger" | "live";

export interface AppStateItem {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: AppStateTone;
  active: boolean;
}

export interface AppStateSummary {
  mode: string;
  headline: string;
  detail: string;
  primaryBadge: string;
  primaryTone: AppStateTone;
  secondaryBadge: string;
  secondaryTone: AppStateTone;
  states: AppStateItem[];
}

export interface MapPuzzleViewState {
  selectedSongId: string;
  selectedSetupId: string;
  edgeFilter: "all" | "active" | "blocked";
  compareMode: "split" | "overlay";
  diagnosticsLens: "timing" | "reference" | "learning";
  memoryNote: string;
  analyzerTargetType: "module" | "edge" | null;
  analyzerTargetId: string;
  analyzerWindow: "short" | "medium" | "long";
}

export interface ListeningFileSourceConfig {
  filePath: string;
  bpmHint: number | null;
  meterHint: string;
  durationHintSec: number | null;
}

export interface PlaylistTrack {
  id: string;
  name: string;
  path: string;
  file: File;
  url: string;
}
