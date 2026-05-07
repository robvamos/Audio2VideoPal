# Skill: High Performance Video Export

## Purpose

Implement live and batch video export with FFmpeg/hardware encoding.

## Requirements

- Export can only start if armed before session start.
- Support headless rendering.
- Support batch file render.
- Support audio muxing.
- Detect FFmpeg/ffprobe.
- Detect encoders: x264, x265, VP9, AV1, NVENC, QSV, AMF.
- Record codec capabilities in SQLite.

## Guidance

- Separate render and encode threads.
- Use queues with backpressure.
- Prefer MKV for robust long recording, optional remux to MP4.
- Track dropped frames and encode FPS.
