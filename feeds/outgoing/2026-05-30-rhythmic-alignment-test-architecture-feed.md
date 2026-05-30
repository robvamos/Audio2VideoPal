# Rhythmic Alignment Test Architecture Feed

Date: `2026-05-30`
Project: `Audio2VideoPal`
Scope: `listening-only rhythmic alignment, BPM tracking, re-lock, downbeat, one-bar grid reconstruction`

## Goal

This feed describes how the current test system is structured to improve the rhythmic alignment stage of the listening pipeline.

The focus is not playback or rendering. The whole effort is centered on:

- following tempo
- surviving tempo changes
- recovering after pauses
- aligning beat `1`
- reconstructing a stable one-bar grid

## Test structure

The current test system is split into three layers.

### 1. Deterministic synthetic benchmark library

Located under:

- `VisualMusic/benchmarks/audio/`
- `VisualMusic/benchmarks/metadata/`
- `VisualMusic/benchmarks/benchmark_catalog.json`

This layer contains internally generated benchmark songs with known structure. It is used to measure:

- BPM tracking stability
- re-lock after tempo transitions
- pause resilience
- downbeat recognition
- grid reconstruction quality

It is deterministic, so changes in score are easier to attribute to strategy changes.

### 2. Public BPM-declared validation library

Located under:

- `VisualMusic/benchmarks/public-bpm-tests/source-mp3/`
- `VisualMusic/benchmarks/public-bpm-tests/audio-wav/`
- `VisualMusic/benchmarks/public-bpm-tests/catalog.json`

This is an external validation set made of public reusable loops downloaded from the internet, each with declared BPM and recorded source metadata.

Current external set:

- `95 BPM`
- `105 BPM`
- `110 BPM`
- `120 BPM`
- `130 BPM`

This layer is meant to pressure-test the listening strategy on non-synthetic material.

### 3. Automated sweep runner

Main file:

- `VisualMusic/scripts/run_benchmark_sweep.py`

This runner evaluates multiple listening configurations automatically and elects a recommended preset.

Outputs:

- `VisualMusic/runtime/benchmark-sweeps/latest.benchmark-sweep.json`
- `VisualMusic/runtime/benchmark-sweeps/latest.benchmark-sweep.md`
- `VisualMusic/configs/listening.benchmark-sweep.recommended.json`

## Components involved

### Analysis branches

- `onset_strength`
  - treated as the transient detector
  - strongest for hats, clicks, attack edges, re-lock, and grid sharpness

- `low_band_pulse`
  - treated as the kick and pulse stabilizer
  - used to reinforce beat confidence and low-end pulse continuity

### Strategy parameters currently tested

- onset-only
- low-band-only
- weighted fusion
- input normalization on/off
- tonal guard on/off
- transient boost
- low-band smoothing window
- threshold bias
- onset band selection
- low band selection
- onset profile type
- low-band energy/flux mix

### Current best family

The current winner is a bright HFC-style onset detector fused with a low-band support branch.

Current recommended preset:

- mode: `dual_weighted`
- onset / low-band weights: `0.66 / 0.34`
- onset band: `1200-10000 Hz`
- low band: `45-180 Hz`
- onset profile: `hfc`
- normalization: `enabled`
- tonal guard: `disabled` on the current benchmark set

## Strategies followed

### Stage 1. Envelope-first baseline

The initial sweep used a simpler full-envelope strategy to get a working benchmark loop quickly.

This gave a first baseline, but it was too coarse to separate the real contribution of the two analysis branches.

### Stage 2. Band-aware sweep

The next step introduced explicit frequency-band analysis.

The reasoning was:

- use mid/high content for attacks and transient clarity
- use low-band content for kick-driven pulse support
- fuse them instead of assuming one branch must dominate globally

This changed the problem from “which single detector wins” to “which role each detector should play”.

### Stage 3. Coarse + refine

The current runner does not stop at one broad candidate grid.

It now works in two passes:

1. coarse candidate sweep
2. local refinement around the coarse winner

This avoids picking a preset from only one rough parameter grid.

## Metrics used

The current sweep scores each candidate across:

- `bpm_score`
- `relock_score`
- `pause_score`
- `downbeat_score`
- `grid_score`
- `mean_bpm_abs_error`

The overall score is a weighted combination, with strongest emphasis on:

- BPM correctness
- re-lock
- grid quality

## Knowledge memory

The listening strategy is now also stored as a support graph so the reasoning does not live only in reports.

Local memory:

- `VisualMusic/knowledge/listening-support-graph.json`
- `VisualMusic/docs/listening-support-graph.md`
- `VisualMusic/docs/listening-plugin-guidance.md`

The graph currently remembers:

- which plugin prefers which band
- which branch drives which metric
- which failure modes weaken each branch
- which preset is currently elected

## Current interpretation

At the moment:

- `onset_strength` is the timing leader
- `low_band_pulse` is not best alone
- but `low_band_pulse` improves the fused strategy once the detector becomes band-aware

So the low-band branch is currently used less as a standalone tracker and more as a pulse reinforcement layer.

## Practical use

This architecture is usable right now for:

- automatic comparison of listening setups
- ranking onset vs low-band vs fused strategies
- validating whether a new frequency choice helps or hurts
- checking if a candidate survives pauses and tempo changes
- extending tests with external public loops

## Next step

The next meaningful evolution is to let the automated sweep include the public BPM-declared validation set in addition to the internal synthetic benchmark set, so the elected preset must survive both deterministic tests and real external material.
