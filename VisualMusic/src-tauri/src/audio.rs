use crate::db::log_event;

#[derive(Debug, Clone)]
pub struct AudioRuntimeState {
    pub active: bool,
    pub sample_rate: u32,
    pub channels: u16,
}

impl Default for AudioRuntimeState {
    fn default() -> Self {
        Self {
            active: false,
            sample_rate: 48000,
            channels: 2,
        }
    }
}

#[tauri::command]
pub fn start_audio_stream() -> Result<String, String> {
    log_event(
        "INFO",
        "audio_runtime",
        "AUDIO_STREAM_START",
        "Audio runtime initialized",
        None,
    );

    Ok("Audio capture pipeline started".to_string())
}

#[tauri::command]
pub fn stop_audio_stream() -> Result<String, String> {
    log_event(
        "INFO",
        "audio_runtime",
        "AUDIO_STREAM_STOP",
        "Audio runtime stopped",
        None,
    );

    Ok("Audio capture pipeline stopped".to_string())
}
