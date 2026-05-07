use rusqlite::Connection;
use std::fs;

pub const DB_PATH: &str = "data/visual_music.db";
pub const SCHEMA: &str = include_str!("schema.sql");

pub fn ensure_data_dir() -> Result<(), String> {
    fs::create_dir_all("data").map_err(|e| e.to_string())
}

pub fn open_db() -> Result<Connection, String> {
    ensure_data_dir()?;
    Connection::open(DB_PATH).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn init_db() -> Result<String, String> {
    let conn = open_db()?;
    conn.execute_batch(SCHEMA).map_err(|e| e.to_string())?;
    Ok("Database initialized".to_string())
}

pub fn log_event(
    level: &str,
    component: &str,
    event_code: &str,
    message: &str,
    details_json: Option<&str>,
) {
    if let Ok(conn) = open_db() {
        let _ = conn.execute(
            "INSERT INTO app_events (timestamp, level, component, event_code, message, details_json)
             VALUES (datetime('now'), ?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![level, component, event_code, message, details_json],
        );
    }
}
