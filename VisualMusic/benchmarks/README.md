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

External validation material:
- `public-bpm-tests/` contains public BPM-declared loops downloaded from the internet and converted to local WAV files for repeated tests.
- `realistic-alignment-tests/` contains denser section-based mixes with drum anchor, harmonic layers, vocal interference and half/double-time ambiguity pressure tests.

Artifacts:
- audio files: `benchmarks/audio/*.wav`
- metadata: `benchmarks/metadata/*.json`
- catalog: `benchmarks/benchmark_catalog.json`

Regeneration:
- `npm run generate:benchmarks`
- `npm run generate:realistic-tests`

Design goals:
- clear beat `1`
- explicit pause windows
- 2 to 4 tempo zones per song
- repeatable material for BPM tracking, re-lock, phase and structure checks
- a second realism layer with fuller arrangements that can challenge beat memory, downbeat confidence and phrase-phase continuity
