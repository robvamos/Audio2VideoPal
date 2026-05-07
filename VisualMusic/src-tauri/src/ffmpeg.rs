use std::process::Command;
use crate::db::log_event;

#[tauri::command]
pub fn detect_ffmpeg() -> Result<String, String> {
    let ffmpeg_output = Command::new("ffmpeg")
        .arg("-version")
        .output()
        .map_err(|e| format!("FFmpeg not found: {}", e))?;

    let version = String::from_utf8_lossy(&ffmpeg_output.stdout)
        .lines()
        .next()
        .unwrap_or("Unknown")
        .to_string();

    log_event(
        "INFO",
        "ffmpeg_runtime",
        "FFMPEG_DETECTED",
        &version,
        None,
    );

    Ok(version)
}

#[tauri::command]
pub fn batch_render_test() -> Result<String, String> {
    log_event(
        "INFO",
        "ffmpeg_runtime",
        "BATCH_RENDER_TEST_START",
        "Starting FFmpeg test render",
        None,
    );

    let output = Command::new("ffmpeg")
        .args(&[
            "-f",
            "lavfi",
            "-i",
            "testsrc=duration=5:size=640x360:rate=30",
            "-c:v",
            "libx264",
            "data/test_output.mp4"
        ])
        .output()
        .map_err(|e| format!("FFmpeg error: {}", e))?;

    if output.status.success() {
        Ok("Test render completed".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}
