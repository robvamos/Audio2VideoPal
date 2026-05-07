use crate::db::log_event;

#[derive(Debug, Clone)]
pub struct VideoRuntimeState {
    pub active: bool,
    pub width: u32,
    pub height: u32,
    pub fps: u32,
}

impl Default for VideoRuntimeState {
    fn default() -> Self {
        Self {
            active: false,
            width: 1920,
            height: 1080,
            fps: 60,
        }
    }
}

#[tauri::command]
pub fn start_video_render() -> Result<String, String> {
    log_event(
        "INFO",
        "video_runtime",
        "VIDEO_RENDER_START",
        "Video render runtime initialized",
        None,
    );

    Ok("Video production pipeline started".to_string())
}

#[tauri::command]
pub fn stop_video_render() -> Result<String, String> {
    log_event(
        "INFO",
        "video_runtime",
        "VIDEO_RENDER_STOP",
        "Video render runtime stopped",
        None,
    );

    Ok("Video production pipeline stopped".to_string())
}
