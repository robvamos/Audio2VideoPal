# Listening telemetry - 20260528-133629-listening-synthetic

Profile: `minimal_one_bar_grid`
Source: `synthetic_pattern`
Status: `success`

## Timing
- Fused BPM: `112.0`
- BPM confidence: `0.98`
- Sync state: `LOCKED`
- Downbeat confidence: `1.00`
- Current beat: `1`
- One-bar grid score: `1.00`

## Wiring
- Active modules: normalizer, onset_strength, low_band_pulse, tempo_autocorrelation, weighted_tempo_fusion, beat_grid_tracker, simple_downbeat_scorer, one_bar_grid_evaluator, telemetry_writer
- Disabled modules: harmonic_change, section_predictor, drum_pattern_generator

## Recommendations
- Keep synthetic_pattern as the baseline fixture while wiring real sources.
- Add reference-aware comparison before enabling microphone mode.
- Promote module-specific telemetry once real feature extractors are connected.
