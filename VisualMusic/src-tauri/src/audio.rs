use crate::db::log_event;

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
