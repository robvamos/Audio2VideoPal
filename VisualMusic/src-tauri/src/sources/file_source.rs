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

    Ok(ResolvedFileSource {
        state,
        bpm,
        meter,
        duration_sec,
        exists_on_disk,
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
