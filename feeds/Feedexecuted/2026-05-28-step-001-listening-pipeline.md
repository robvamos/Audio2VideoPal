# Step 001 - Minimal Listening Pipeline

## What was interpreted

The feed asked for a first non-trivial replacement of the command-stub pattern with a modular core centered on:

- event and module abstractions;
- a configurable pipeline profile;
- synthetic BPM/downbeat source;
- one-bar grid scoring;
- telemetry output;
- frontend visibility of BPM and sync state.

## Files changed

- `VisualMusic/src-tauri/src/audio.rs`
- `VisualMusic/src-tauri/src/lib.rs`
- `VisualMusic/src-tauri/src/core/mod.rs`
- `VisualMusic/src-tauri/src/core/event.rs`
- `VisualMusic/src-tauri/src/core/module.rs`
- `VisualMusic/src-tauri/src/core/runtime_state.rs`
- `VisualMusic/src-tauri/src/core/telemetry.rs`
- `VisualMusic/src-tauri/src/core/pipeline.rs`
- `VisualMusic/src-tauri/src/sources/mod.rs`
- `VisualMusic/src-tauri/src/sources/synthetic_source.rs`
- `VisualMusic/configs/pipeline.minimal_one_bar_grid.json`
- `VisualMusic/src/services/tauriApi.ts`
- `VisualMusic/src/engines/pipelineEngine.ts`
- `VisualMusic/src/components/AudioVideoPipeline.tsx`
- `VisualMusic/src/types.ts`
- `VisualMusic/src/App.css`

## Inferences produced

- The repository state on GitHub is earlier than the previously modified local branch, so the correct strategy was a fresh first slice rather than adapting a richer in-progress implementation.
- The fastest safe way to satisfy the feed was to make the listening pipeline deterministic first, then wire the UI and telemetry around it.

## Conflicts detected

- No merge conflicts with remote files.
- `cargo check` initially failed because of the build output path, not because of Rust code errors. This was resolved by forcing `CARGO_TARGET_DIR`.

## Residual gaps

- `PipelineModule` is defined but not yet consumed by concrete modules.
- The current listening run derives from a synthetic schedule, not audio analysis.
- Video rendering remains separate and stub-level.

## Updated models

- Internal runtime model now includes `TimingState`, `OneBarGridResult`, `ListeningTelemetry` and `ListeningRunResult`.
- The pipeline panel now behaves like a first listening control room instead of only start/stop buttons.

## Generated images

- None.
