// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use rusqlite::Connection;
use std::fs;
use std::process::Command;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use rustfft::{FftPlanner, num_complex::Complex};
use std::sync::Arc;
use tokio::sync::Mutex;
use pelite::PeFile;
use sha2::{Sha256, Digest};
use std::path::Path;

const SCHEMA: &str = r#"
-- Visual Music App - SQLite schema draft

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS plugin_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_extension TEXT,
    file_size_bytes INTEGER,
    sha256 TEXT NOT NULL,
    md5 TEXT,
    architecture TEXT CHECK (architecture IN ('x86','x64','unknown')) DEFAULT 'unknown',
    windows_file_version TEXT,
    product_version TEXT,
    product_name TEXT,
    company_name TEXT,
    file_description TEXT,
    original_filename TEXT,
    digital_signature_present INTEGER DEFAULT 0,
    digital_signature_subject TEXT,
    first_seen_at TEXT,
    last_seen_at TEXT,
    last_scanned_at TEXT,
    deep_scan_status TEXT CHECK (deep_scan_status IN ('pending','scanning','completed','failed','unknown')) DEFAULT 'unknown',
    deep_scan_completed_at TEXT,
    user_trust_status TEXT CHECK (user_trust_status IN ('unknown','trusted','blocked')) DEFAULT 'unknown',
    safety_notes TEXT,
    UNIQUE(sha256)
);

CREATE TABLE IF NOT EXISTS winamp_plugins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_file_id INTEGER NOT NULL REFERENCES plugin_files(id) ON DELETE CASCADE,
    winamp_api_version INTEGER,
    plugin_description TEXT,
    exported_entrypoint_found INTEGER DEFAULT 0,
    entrypoint_name TEXT DEFAULT 'winampVisGetHeader',
    header_read_status TEXT,
    module_count INTEGER,
    last_inspection_status TEXT,
    last_inspection_error TEXT,
    last_inspection_at TEXT
);

CREATE TABLE IF NOT EXISTS plugin_modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    winamp_plugin_id INTEGER NOT NULL REFERENCES winamp_plugins(id) ON DELETE CASCADE,
    module_index INTEGER NOT NULL,
    module_description TEXT,
    has_config_function INTEGER DEFAULT 0,
    has_init_function INTEGER DEFAULT 0,
    has_render_function INTEGER DEFAULT 0,
    has_quit_function INTEGER DEFAULT 0,
    default_delay_ms INTEGER,
    supports_embedded_window TEXT CHECK (supports_embedded_window IN ('unknown','yes','no','partial')) DEFAULT 'unknown',
    preferred_render_mode TEXT CHECK (preferred_render_mode IN ('embedded','separate_window','fullscreen','unknown')) DEFAULT 'unknown',
    compatibility_status TEXT DEFAULT 'Unknown',
    notes TEXT,
    UNIQUE(winamp_plugin_id, module_index)
);

CREATE TABLE IF NOT EXISTS plugin_compatibility_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_module_id INTEGER REFERENCES plugin_modules(id) ON DELETE CASCADE,
    test_type TEXT,
    test_result TEXT,
    host_architecture TEXT,
    os_version TEXT,
    app_version TEXT,
    gpu_info TEXT,
    error_code TEXT,
    error_message TEXT,
    crash_dump_path TEXT,
    duration_ms INTEGER,
    tested_at TEXT
);

CREATE TABLE IF NOT EXISTS plugin_deep_scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_file_id INTEGER NOT NULL REFERENCES plugin_files(id) ON DELETE CASCADE,
    scan_timestamp TEXT,
    scan_method TEXT,
    pe_signature TEXT,
    machine_type TEXT,
    bitness TEXT,
    is_dll INTEGER,
    subsystem TEXT,
    characteristics TEXT,
    sections_json TEXT,
    exports_json TEXT,
    version_info_json TEXT,
    supported_exports TEXT,
    estimated_resolution_class TEXT CHECK (estimated_resolution_class IN ('A','B','C','D','E')) DEFAULT 'E',
    supports_embedded_window INTEGER DEFAULT 0,
    supports_separate_window INTEGER DEFAULT 0,
    supports_fullscreen INTEGER DEFAULT 0,
    estimated_audio_input TEXT,
    estimated_video_output TEXT,
    potential_parameters_json TEXT,
    scan_result TEXT,
    scan_error TEXT,
    scan_status TEXT
);

CREATE TABLE IF NOT EXISTS plugin_resolution_capabilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_module_id INTEGER NOT NULL REFERENCES plugin_modules(id) ON DELETE CASCADE,
    capability_class TEXT CHECK (capability_class IN ('A','B','C','D','E')) DEFAULT 'E',
    min_width INTEGER,
    min_height INTEGER,
    max_tested_width INTEGER,
    max_tested_height INTEGER,
    stable_width INTEGER,
    stable_height INTEGER,
    supports_resize INTEGER DEFAULT 0,
    supports_headless INTEGER DEFAULT 0,
    supports_hidden_window INTEGER DEFAULT 0,
    requires_visible_window INTEGER DEFAULT 0,
    supports_independent_export_resolution INTEGER DEFAULT 0,
    requires_scaling_for_export INTEGER DEFAULT 1,
    last_tested_at TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS visualizer_presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visualizer_type TEXT,
    name TEXT NOT NULL,
    description TEXT,
    plugin_module_id INTEGER REFERENCES plugin_modules(id) ON DELETE SET NULL,
    preset_file_path TEXT,
    preset_hash TEXT,
    parameters_json TEXT,
    created_at TEXT,
    updated_at TEXT,
    user_rating INTEGER
);

CREATE TABLE IF NOT EXISTS media_tools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_name TEXT,
    executable_path TEXT,
    detected_version TEXT,
    available INTEGER DEFAULT 0,
    detection_status TEXT,
    detection_error TEXT,
    first_detected_at TEXT,
    last_checked_at TEXT
);

CREATE TABLE IF NOT EXISTS codec_capabilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    media_tool_id INTEGER REFERENCES media_tools(id) ON DELETE CASCADE,
    codec_name TEXT,
    codec_type TEXT,
    codec_family TEXT,
    implementation TEXT,
    supports_hardware_acceleration INTEGER DEFAULT 0,
    supports_lossless INTEGER DEFAULT 0,
    supports_alpha INTEGER DEFAULT 0,
    notes TEXT,
    detected_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT,
    stopped_at TEXT,
    duration_ms INTEGER,
    mode TEXT,
    input_source_type TEXT,
    input_device_name TEXT,
    input_sample_rate INTEGER,
    input_channels INTEGER,
    visualizer_type TEXT,
    plugin_module_id INTEGER REFERENCES plugin_modules(id) ON DELETE SET NULL,
    preset_id INTEGER REFERENCES visualizer_presets(id) ON DELETE SET NULL,
    live_width INTEGER,
    live_height INTEGER,
    export_enabled_at_start INTEGER DEFAULT 0,
    export_width INTEGER,
    export_height INTEGER,
    export_fps INTEGER,
    export_bitrate INTEGER,
    export_format TEXT,
    status TEXT,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS render_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_type TEXT,
    input_type TEXT,
    input_file_path TEXT,
    input_file_hash TEXT,
    input_format TEXT,
    input_duration_ms INTEGER,
    input_sample_rate INTEGER,
    input_channels INTEGER,
    visualizer_type TEXT,
    plugin_module_id INTEGER REFERENCES plugin_modules(id) ON DELETE SET NULL,
    preset_id INTEGER REFERENCES visualizer_presets(id) ON DELETE SET NULL,
    requested_width INTEGER,
    requested_height INTEGER,
    actual_render_width INTEGER,
    actual_render_height INTEGER,
    output_width INTEGER,
    output_height INTEGER,
    fps INTEGER,
    render_mode TEXT,
    resolution_strategy TEXT,
    status TEXT,
    progress_percent REAL,
    created_at TEXT,
    started_at TEXT,
    completed_at TEXT,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS exports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
    render_job_id INTEGER REFERENCES render_jobs(id) ON DELETE SET NULL,
    file_path TEXT,
    file_name TEXT,
    file_size_bytes INTEGER,
    format TEXT,
    codec TEXT,
    width INTEGER,
    height INTEGER,
    fps INTEGER,
    bitrate INTEGER,
    duration_ms INTEGER,
    sha256 TEXT,
    created_at TEXT,
    export_status TEXT,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    render_job_id INTEGER REFERENCES render_jobs(id) ON DELETE CASCADE,
    timestamp TEXT,
    avg_render_fps REAL,
    min_render_fps REAL,
    avg_encode_fps REAL,
    dropped_frames INTEGER,
    rendered_frames INTEGER,
    encoded_frames INTEGER,
    avg_render_ms REAL,
    avg_encode_ms REAL,
    cpu_usage_percent REAL,
    gpu_usage_percent REAL,
    memory_mb REAL,
    batch_speed_factor REAL,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS app_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    level TEXT,
    component TEXT,
    session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
    plugin_file_id INTEGER REFERENCES plugin_files(id) ON DELETE SET NULL,
    plugin_module_id INTEGER REFERENCES plugin_modules(id) ON DELETE SET NULL,
    event_code TEXT,
    message TEXT,
    details_json TEXT
);
"#;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn init_db() -> Result<String, String> {
    fs::create_dir_all("data").map_err(|e| e.to_string())?;
    let conn = Connection::open("data/visual_music.db").map_err(|e| e.to_string())?;
    conn.execute_batch(SCHEMA).map_err(|e| e.to_string())?;
    Ok("Database initialized".to_string())
}

#[tauri::command]
fn detect_ffmpeg() -> Result<String, String> {
    let ffmpeg_output = Command::new("ffmpeg")
        .arg("-version")
        .output()
        .map_err(|e| format!("FFmpeg not found: {}", e))?;
    let ffprobe_output = Command::new("ffprobe")
        .arg("-version")
        .output()
        .map_err(|e| format!("ffprobe not found: {}", e))?;
    
    let ffmpeg_version = String::from_utf8_lossy(&ffmpeg_output.stdout).lines().next().unwrap_or("Unknown").to_string();
    let ffprobe_version = String::from_utf8_lossy(&ffprobe_output.stdout).lines().next().unwrap_or("Unknown").to_string();
    
    Ok(format!("FFmpeg: {}\nffprobe: {}", ffmpeg_version, ffprobe_version))
}

#[tauri::command]
fn batch_render_test() -> Result<String, String> {
    // Simulate batch render: create a test pattern video
    let output = Command::new("ffmpeg")
        .args(&["-f", "lavfi", "-i", "testsrc=duration=5:size=320x240:rate=1", "-c:v", "libx264", "data/test_output.mp4"])
        .output()
        .map_err(|e| format!("FFmpeg error: {}", e))?;
    
    if output.status.success() {
        Ok("Test video exported to data/test_output.mp4".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
fn scan_plugins() -> Result<String, String> {
    let conn = Connection::open("data/visual_music.db").map_err(|e| e.to_string())?;
    let plugins_dir = "plugins";
    let mut count = 0;
    
    for entry in fs::read_dir(plugins_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("dll") {
            let file_path = path.to_string_lossy().to_string();
            let file_name = path.file_name().unwrap().to_string_lossy().to_string();
            let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
            let file_size = metadata.len() as i64;
            
            // Calculate SHA256
            let mut file = fs::File::open(&path).map_err(|e| e.to_string())?;
            let mut hasher = Sha256::new();
            std::io::copy(&mut file, &mut hasher).map_err(|e| e.to_string())?;
            let sha256 = format!("{:x}", hasher.finalize());
            
            // Determine architecture using pelite
            let pe_file = PeFile::from_bytes(&fs::read(&path).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
            let architecture = if pe_file.is_64_bit() { "x64" } else { "x86" };
            
            // Insert into DB
            conn.execute(
                "INSERT OR REPLACE INTO plugin_files (file_path, file_name, file_size_bytes, sha256, architecture, first_seen_at) VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))",
                &[&file_path, &file_name, &file_size.to_string(), &sha256, architecture],
            ).map_err(|e| e.to_string())?;
            
            count += 1;
        }
    }
    
    Ok(format!("Scanned {} plugins", count))
}

#[tauri::command]
fn deep_scan_plugin(file_path: String) -> Result<String, String> {
    use std::process::Command;
    
    if !std::path::Path::new(&file_path).exists() {
        return Err(format!("File not found: {}", file_path));
    }
    
    let output_json = "data/deep_scan_output.json";
    
    // Detect OS and use appropriate scanning tool
    let _output = if cfg!(target_os = "windows") {
        // Use Windows batch script
        Command::new("cmd")
            .args(&["/C", "scantools/scripts/run_deep_scan_windows.bat", &file_path, output_json])
            .output()
            .map_err(|e| format!("Failed to execute Windows scanner: {}", e))?
    } else {
        // Use bash script for Unix-like systems
        Command::new("bash")
            .arg("scantools/run_deep_scan.sh")
            .arg(&file_path)
            .arg(output_json)
            .output()
            .map_err(|e| format!("Failed to execute scanner: {}", e))?
    };
    
    // Read the scan results
    let scan_result = fs::read_to_string(output_json)
        .map_err(|e| format!("Failed to read scan results: {}", e))?;
    
    // Parse JSON
    let scan_data: serde_json::Value = serde_json::from_str(&scan_result)
        .map_err(|e| format!("Invalid JSON from scanner: {}", e))?;
    
    // Store in database
    let conn = Connection::open("data/visual_music.db")
        .map_err(|e| e.to_string())?;
    
    // Get plugin_file_id
    let mut stmt = conn.prepare(
        "SELECT id FROM plugin_files WHERE file_path = ?1"
    ).map_err(|e| e.to_string())?;
    
    let plugin_id: i64 = stmt.query_row([&file_path], |row| {
        row.get(0)
    }).map_err(|_| "Plugin not found in database".to_string())?;
    
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let machine_type = scan_data["base_analysis"]["machine_type"]
        .as_str()
        .or_else(|| scan_data["machine_type"].as_str())
        .unwrap_or("unknown");
    let bitness = scan_data["base_analysis"]["bitness"]
        .as_str()
        .or_else(|| scan_data["bitness"].as_str())
        .unwrap_or("unknown");
    let is_dll = scan_data["base_analysis"]["is_dll"]
        .as_bool()
        .or_else(|| scan_data["is_dll"].as_bool())
        .unwrap_or(false) as i32;
    
    conn.execute(
        "INSERT INTO plugin_deep_scans (plugin_file_id, scan_timestamp, scan_method, machine_type, bitness, is_dll, scan_result, scan_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        [
            plugin_id.to_string(),
            now.clone(),
            "deep_scan_v1".to_string(),
            machine_type.to_string(),
            bitness.to_string(),
            is_dll.to_string(),
            scan_result.clone(),
            "completed".to_string()
        ],
    ).map_err(|e| e.to_string())?;
    
    // Update plugin_files status
    conn.execute(
        "UPDATE plugin_files SET deep_scan_status = 'completed', deep_scan_completed_at = datetime('now') WHERE id = ?1",
        [plugin_id.to_string()],
    ).map_err(|e| e.to_string())?;
    
    Ok(format!("Deep scan completed for {}", file_path))
}

#[tauri::command]
fn get_plugin_deep_scan(file_id: i64) -> Result<String, String> {
    let conn = Connection::open("data/visual_music.db")
        .map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT scan_timestamp, machine_type, bitness, is_dll, scan_result FROM plugin_deep_scans WHERE plugin_file_id = ?1 ORDER BY scan_timestamp DESC LIMIT 1"
    ).map_err(|e| e.to_string())?;
    
    let result = stmt.query_row([file_id], |row| {
        Ok(format!(
            r#"{{"timestamp": "{}", "machine_type": "{}", "bitness": "{}", "is_dll": {}, "raw_scan": {}}}"#,
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, i32>(3)?,
            row.get::<_, String>(4)?
        ))
    }).map_err(|_| "No scan found for this plugin".to_string())?;
    
    Ok(result)
}

#[tauri::command]
fn get_plugins_list() -> Result<String, String> {
    let conn = Connection::open("data/visual_music.db")
        .map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT id, file_name, file_path, architecture, file_size_bytes, sha256, deep_scan_status, deep_scan_completed_at FROM plugin_files ORDER BY file_name ASC"
    ).map_err(|e| e.to_string())?;
    
    let plugins = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, i64>(0)?,
            "file_name": row.get::<_, String>(1)?,
            "file_path": row.get::<_, String>(2)?,
            "architecture": row.get::<_, String>(3)?,
            "file_size_bytes": row.get::<_, i64>(4)?,
            "sha256": row.get::<_, String>(5)?,
            "deep_scan_status": row.get::<_, String>(6)?,
            "deep_scan_completed_at": row.get::<_, Option<String>>(7)?
        }))
    }).map_err(|e| e.to_string())?;
    
    let mut plugin_list = Vec::new();
    for plugin_result in plugins {
        plugin_list.push(plugin_result.map_err(|e| e.to_string())?);
    }
    
    Ok(serde_json::to_string(&plugin_list).map_err(|e| e.to_string())?)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, init_db, detect_ffmpeg, batch_render_test, scan_plugins, deep_scan_plugin, get_plugin_deep_scan, get_plugins_list])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
