# Modular Architecture

Audio2VideoPal is moving toward a Winamp-style split between user interface, engines, plugin registry, and long-running media work.

## Frontend Layers

- `src/components`: React views and controls only. Components call engine facades instead of Tauri commands directly.
- `src/engines`: UI-facing facades for system, plugin, input, output, and pipeline operations.
- `src/services`: transport adapters for Tauri IPC.
- `src/skins`: centralized skin registry and provider. Every visual surface must inherit color, border, shadow, and panel tokens from the active skin.

## Backend Modules

- `src-tauri/src/db.rs`: database initialization and shared event logging.
- `src-tauri/src/plugin_registry.rs`: plugin file inventory, hashing, architecture detection, deep scan storage, and plugin list APIs.
- `src-tauri/src/ffmpeg.rs`: FFmpeg detection and render test commands.
- `src-tauri/src/audio.rs`: audio input and stream command boundary.
- `src-tauri/src/video.rs`: video output and render command boundary.

## Plugin Process Model

Winamp plugins are grouped by responsibility: input (`in_*.dll`), output (`out_*.dll`), encoders (`enc_*.dll`), visualization (`vis_*.dll`), DSP (`dsp_*.dll`), media library (`ml_*.dll`), and general services (`gen_*.dll`).

Legacy visualization plugins such as MilkDrop (`vis_milk2.dll`) and AVS (`vis_avs.dll`) are 32-bit Winamp DLLs and should be treated as isolated compatibility targets. The preferred direction is a dedicated host process per legacy plugin family, with IPC back to the main Tauri app, instead of loading old DLLs inside the primary app process.

## Recording Rule

Every plugin analyzed or copied into the application workspace must be registered in the SQLite database before or during analysis. The database is local runtime state under `src-tauri/data` and is intentionally ignored by Git.
