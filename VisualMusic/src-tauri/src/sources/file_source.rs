use crate::db::ensure_data_dir;
use crate::sources::synthetic_source::SyntheticPatternSource;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;

const FILE_SOURCE_STATE_PATH: &str = "data/listening_file_source.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileSourceState {
    pub file_path: String,
    pub bpm_hint: Option<f64>,
    pub meter_hint: String,
    pub duration_hint_sec: Option<f64>,
}

#[derive(Debug, Clone)]
pub struct FileWaveformSummary {
    pub normalized_envelope: Vec<f64>,
    pub transient_indexes: Vec<usize>,
    pub peak_level: f64,
    pub floor_level: f64,
}

impl Default for FileSourceState {
    fn default() -> Self {
        Self {
            file_path: String::new(),
            bpm_hint: Some(112.0),
            meter_hint: "4/4".to_string(),
            duration_hint_sec: Some(16.0),
        }
    }
}

pub struct ResolvedFileSource {
    pub state: FileSourceState,
    pub bpm: f64,
    pub meter: String,
    pub duration_sec: f64,
    pub exists_on_disk: bool,
    pub waveform_summary: Option<FileWaveformSummary>,
}

pub fn load_file_source_state() -> FileSourceState {
    if let Ok(content) = fs::read_to_string(FILE_SOURCE_STATE_PATH) {
        if let Ok(state) = serde_json::from_str::<FileSourceState>(&content) {
            return state;
        }
    }

    FileSourceState::default()
}

pub fn save_file_source_state(state: &FileSourceState) -> Result<(), String> {
    ensure_data_dir()?;
    fs::write(
        FILE_SOURCE_STATE_PATH,
        serde_json::to_string_pretty(state).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())
}

fn infer_bpm_from_filename(path: &str) -> Option<f64> {
    let lower = path.to_lowercase();
    let bpm_index = lower.find("bpm")?;
    let prefix = &lower[..bpm_index];
    let digits_reversed = prefix
        .chars()
        .rev()
        .skip_while(|character| !character.is_ascii_digit())
        .take_while(|character| character.is_ascii_digit())
        .collect::<String>();
    if digits_reversed.is_empty() {
        return None;
    }

    digits_reversed
        .chars()
        .rev()
        .collect::<String>()
        .parse::<f64>()
        .ok()
}

fn detect_duration_with_ffprobe(file_path: &str) -> Option<f64> {
    let output = Command::new("ffprobe")
        .args([
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            file_path,
        ])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    String::from_utf8_lossy(&output.stdout)
        .trim()
        .parse::<f64>()
        .ok()
}

fn decode_file_waveform_summary(file_path: &str, duration_sec: f64) -> Option<FileWaveformSummary> {
    let analysis_duration = duration_sec.clamp(6.0, 45.0).to_string();
    let output = Command::new("ffmpeg")
        .args([
            "-v",
            "error",
            "-t",
            &analysis_duration,
            "-i",
            file_path,
            "-ac",
            "1",
            "-ar",
            "2000",
            "-f",
            "s16le",
            "-",
        ])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let pcm = output.stdout;
    if pcm.len() < 4 {
        return None;
    }

    let pcm_samples = pcm
        .chunks_exact(2)
        .map(|chunk| i16::from_le_bytes([chunk[0], chunk[1]]) as f64 / i16::MAX as f64)
        .collect::<Vec<_>>();

    if pcm_samples.len() < 32 {
        return None;
    }

    let bucket_count = 64usize;
    let samples_per_bucket = (pcm_samples.len() / bucket_count).max(1);
    let mut envelope = pcm_samples
        .chunks(samples_per_bucket)
        .take(bucket_count)
        .map(|window| {
            let sum = window.iter().map(|sample| sample.abs()).sum::<f64>();
            (sum / window.len().max(1) as f64).clamp(0.0, 1.0)
        })
        .collect::<Vec<_>>();

    while envelope.len() < bucket_count {
        let last = envelope.last().copied().unwrap_or(0.0);
        envelope.push(last);
    }

    let peak_level = envelope.iter().copied().fold(0.0, f64::max);
    let floor_level = envelope.iter().copied().fold(1.0, f64::min);
    if peak_level <= 0.0001 {
        return None;
    }

    let normalized_envelope = envelope
        .iter()
        .map(|value| (value / peak_level).clamp(0.0, 1.0))
        .collect::<Vec<_>>();
    let transient_threshold = ((floor_level / peak_level) + 0.22).clamp(0.28, 0.78);
    let transient_indexes = normalized_envelope
        .iter()
        .enumerate()
        .filter_map(|(index, value)| {
            let previous = index
                .checked_sub(1)
                .and_then(|prev| normalized_envelope.get(prev))
                .copied()
                .unwrap_or(*value);
            let next = normalized_envelope
                .get(index + 1)
                .copied()
                .unwrap_or(*value);
            if *value >= transient_threshold && *value >= previous && *value >= next {
                Some(index)
            } else {
                None
            }
        })
        .collect::<Vec<_>>();

    Some(FileWaveformSummary {
        normalized_envelope,
        transient_indexes,
        peak_level,
        floor_level,
    })
}

pub fn resolve_file_source() -> Result<ResolvedFileSource, String> {
    let state = load_file_source_state();
    if state.file_path.trim().is_empty() {
        return Err("File source selected but no file path is configured yet".to_string());
    }

    let exists_on_disk = Path::new(&state.file_path).exists();
    let bpm = state
        .bpm_hint
        .or_else(|| infer_bpm_from_filename(&state.file_path))
        .unwrap_or(112.0);
    let meter = if state.meter_hint.trim().is_empty() {
        "4/4".to_string()
    } else {
        state.meter_hint.clone()
    };
    let duration_sec = detect_duration_with_ffprobe(&state.file_path)
        .or(state.duration_hint_sec)
        .unwrap_or(16.0)
        .max(4.0);
    let waveform_summary = if exists_on_disk {
        decode_file_waveform_summary(&state.file_path, duration_sec)
    } else {
        None
    };

    Ok(ResolvedFileSource {
        state,
        bpm,
        meter,
        duration_sec,
        exists_on_disk,
        waveform_summary,
    })
}

pub fn build_file_pattern_source() -> Result<(SyntheticPatternSource, ResolvedFileSource), String> {
    let resolved = resolve_file_source()?;
    let source = SyntheticPatternSource::new(
        resolved.bpm,
        resolved.meter.clone(),
        resolved.duration_sec,
    );
    Ok((source, resolved))
}
