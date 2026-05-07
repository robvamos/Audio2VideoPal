use crate::db::open_db;
use pelite::{PeFile, Wrap};
use rusqlite::Connection;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::Path;
use std::process::Command;

fn plugin_architecture(path: &Path) -> Result<String, String> {
    let pe_bytes = fs::read(path).map_err(|e| e.to_string())?;
    let pe_file = PeFile::from_bytes(&pe_bytes).map_err(|e| e.to_string())?;
    let architecture = match pe_file {
        Wrap::T32(_) => "x86",
        Wrap::T64(_) => "x64",
    };
    Ok(architecture.to_string())
}

fn plugin_sha256(path: &Path) -> Result<String, String> {
    let mut file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    std::io::copy(&mut file, &mut hasher).map_err(|e| e.to_string())?;
    Ok(format!("{:x}", hasher.finalize()))
}

fn plugin_category(file_name: &str) -> String {
    match file_name.split_once('_').map(|(prefix, _)| prefix) {
        Some("vis") => "visualization".to_string(),
        Some("in") => "input".to_string(),
        Some("out") => "output".to_string(),
        Some("enc") => "encoder".to_string(),
        Some("dsp") => "dsp".to_string(),
        Some("gen") => "general".to_string(),
        Some("ml") => "media_library".to_string(),
        Some("pmp") => "portable_media".to_string(),
        Some(prefix) => prefix.to_string(),
        None => "unknown".to_string(),
    }
}

fn ensure_plugin_file_record(conn: &Connection, path: &Path) -> Result<i64, String> {
    if !path.exists() {
        return Err(format!("File not found: {}", path.display()));
    }

    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    let file_path = path.to_string_lossy().to_string();
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| format!("Invalid plugin filename: {}", path.display()))?
        .to_string();
    let file_extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_lowercase();
    let file_size = metadata.len() as i64;
    let sha256 = plugin_sha256(path)?;
    let architecture = if file_extension == "dll" {
        plugin_architecture(path).unwrap_or_else(|_| "unknown".to_string())
    } else {
        "unknown".to_string()
    };
    let safety_notes = format!("category={}", plugin_category(&file_name));

    conn.execute(
        "INSERT INTO plugin_files (
            file_path, file_name, file_extension, file_size_bytes, sha256, architecture,
            first_seen_at, last_seen_at, last_scanned_at, safety_notes
         )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'), datetime('now'), datetime('now'), ?7)
         ON CONFLICT(sha256) DO UPDATE SET
            file_path = excluded.file_path,
            file_name = excluded.file_name,
            file_extension = excluded.file_extension,
            file_size_bytes = excluded.file_size_bytes,
            architecture = excluded.architecture,
            last_seen_at = datetime('now'),
            last_scanned_at = datetime('now'),
            safety_notes = excluded.safety_notes",
        (
            &file_path,
            &file_name,
            &file_extension,
            file_size,
            &sha256,
            &architecture,
            &safety_notes,
        ),
    )
    .map_err(|e| e.to_string())?;

    conn.query_row("SELECT id FROM plugin_files WHERE sha256 = ?1", [&sha256], |row| row.get(0))
        .map_err(|e| e.to_string())
}

fn scan_plugin_directory(directory: &str) -> Result<String, String> {
    let conn = open_db()?;
    let mut count = 0;
    let mut skipped = 0;

    for entry in fs::read_dir(directory).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path
            .extension()
            .and_then(|s| s.to_str())
            .map(|s| s.eq_ignore_ascii_case("dll"))
            == Some(true)
        {
            ensure_plugin_file_record(&conn, &path)?;
            count += 1;
        } else {
            skipped += 1;
        }
    }

    Ok(format!(
        "Registered {} plugin DLLs from {} ({} non-DLL files skipped)",
        count, directory, skipped
    ))
}

#[tauri::command]
pub fn scan_plugins() -> Result<String, String> {
    scan_plugin_directory("plugins")
}

#[tauri::command]
pub fn scan_plugins_in_directory(directory_path: String) -> Result<String, String> {
    scan_plugin_directory(&directory_path)
}

#[tauri::command]
pub fn deep_scan_plugin(file_path: String) -> Result<String, String> {
    let plugin_path = Path::new(&file_path);
    if !plugin_path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    let output_json = "data/deep_scan_output.json";
    let _output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(&["/C", "scantools/scripts/run_deep_scan_windows.bat", &file_path, output_json])
            .output()
            .map_err(|e| format!("Failed to execute Windows scanner: {}", e))?
    } else {
        Command::new("bash")
            .arg("scantools/run_deep_scan.sh")
            .arg(&file_path)
            .arg(output_json)
            .output()
            .map_err(|e| format!("Failed to execute scanner: {}", e))?
    };

    let scan_result = fs::read_to_string(output_json)
        .map_err(|e| format!("Failed to read scan results: {}", e))?;
    let scan_data: serde_json::Value = serde_json::from_str(&scan_result)
        .map_err(|e| format!("Invalid JSON from scanner: {}", e))?;

    let conn = open_db()?;
    let plugin_id = ensure_plugin_file_record(&conn, plugin_path)?;
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
        "INSERT INTO plugin_deep_scans (
            plugin_file_id, scan_timestamp, scan_method, machine_type, bitness, is_dll,
            scan_result, scan_status
         )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        (
            plugin_id,
            now,
            "deep_scan_v1",
            machine_type,
            bitness,
            is_dll,
            scan_result.clone(),
            "completed",
        ),
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE plugin_files SET deep_scan_status = 'completed', deep_scan_completed_at = datetime('now') WHERE id = ?1",
        [plugin_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(format!("Deep scan completed for {}", file_path))
}

#[tauri::command]
pub fn get_plugin_deep_scan(file_id: i64) -> Result<String, String> {
    let conn = open_db()?;
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
pub fn get_plugins_list() -> Result<String, String> {
    let conn = open_db()?;
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
