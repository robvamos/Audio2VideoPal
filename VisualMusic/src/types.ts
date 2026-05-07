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

export interface PipelineState {
  audioActive: boolean;
  videoActive: boolean;
}
