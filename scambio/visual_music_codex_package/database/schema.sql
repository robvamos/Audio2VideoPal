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
