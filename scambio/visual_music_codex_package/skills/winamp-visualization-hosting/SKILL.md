# Skill: Winamp Visualization Hosting

## Purpose

Help Codex implement safe hosting of Winamp visualization plugin DLLs.

## Core knowledge

- Winamp visualizer DLLs expose `winampVisGetHeader`.
- Host reads plugin header and enumerates modules.
- Modules expose lifecycle functions: Config, Init, Render, Quit.
- Plugins expect waveform/spectrum data.
- Legacy plugins are often 32-bit.
- Never load untrusted DLLs into main process.

## Implementation guidance

- Main app stays 64-bit.
- Use separate x86 helper for legacy DLLs.
- Use IPC/shared memory for audio data and frames.
- Use watchdog timeouts for Init/Render.
- Record every load/test/crash in SQLite.
- Provide embedded, managed-window and fallback window-capture modes.

## Safety

- No automatic downloads.
- Hash every DLL.
- User confirmation before load.
- Allow blocklist.
- Isolate crashes.
