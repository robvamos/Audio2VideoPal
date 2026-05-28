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
  reference_segments: StructureSegment[];
  reconstructed_segments: StructureSegment[];
}

export interface LearningTelemetry {
  current_stage: string;
  rating_scale: string[];
  test_songs: TestSongDefinition[];
  structure_comparison: StructureComparison;
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

export interface PlaylistTrack {
  id: string;
  name: string;
  path: string;
  file: File;
  url: string;
}
