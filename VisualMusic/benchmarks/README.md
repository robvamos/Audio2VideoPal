# Benchmark Audio Library

This folder contains deterministic benchmark songs for the listening pipeline.

Each benchmark provides:
- a `.wav` file with known tempo sections
- known pause windows
- known downbeats and beat markers
- a JSON metadata file with ground truth

The current base set includes:
- `phase_alignment_drill`
- `grid16_phrase_map`
- `tempo_transition_stress`
- `generic_reference_sample`
- `reference_live_calibration`

Artifacts:
- audio files: `benchmarks/audio/*.wav`
- metadata: `benchmarks/metadata/*.json`
- catalog: `benchmarks/benchmark_catalog.json`

Regeneration:
- `npm run generate:benchmarks`

Design goals:
- clear beat `1`
- explicit pause windows
- 2 to 4 tempo zones per song
- repeatable material for BPM tracking, re-lock, phase and structure checks
