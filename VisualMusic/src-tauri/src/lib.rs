mod audio;
mod db;
mod ffmpeg;
mod plugin_registry;
mod video;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            db::init_db,
            ffmpeg::detect_ffmpeg,
            ffmpeg::batch_render_test,
            plugin_registry::scan_plugins,
            plugin_registry::scan_plugins_in_directory,
            plugin_registry::deep_scan_plugin,
            plugin_registry::get_plugin_deep_scan,
            plugin_registry::get_plugins_list,
            audio::start_audio_stream,
            audio::stop_audio_stream,
            video::start_video_render,
            video::stop_video_render
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
