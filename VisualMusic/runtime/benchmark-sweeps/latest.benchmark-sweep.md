# Benchmark Sweep

Generated: `2026-05-30T04:25:31`
Analysis version: `band-aware-v6-memory-realistic-bpm80-130`
Evaluation suites: `{'synthetic_deterministic': 5, 'public_bpm_loop': 5, 'realistic_alignment': 3}`
Tracking BPM range: `80-130`

## Recommended candidate

- id: `onset_flux_mid_hi_norm`
- mode: `onset_only`
- onset / low-band weights: `1.00 / 0.00`
- listening memory weights: `0.52 / 0.32 / 0.16`
- onset band: `700-6500 Hz`
- low band: `45-180 Hz`
- onset profile: `flux`
- normalize: `True`
- tonality guard: `False`
- overall score: `0.744`
- mean grid score: `0.541`
- mean musical grid score: `0.651`
- mean downbeat score: `0.606`
- mean BPM abs error: `3.351`

## Top candidates

| candidate | mode | onset band | low band | profile | listen mem | weights | guard | musical | downbeat | overall | bpm err | grid |
|---|---|---|---|---|---|---|---|---:|---:|---:|---:|---:|
| `onset_flux_mid_hi_norm` | `onset_only` | `700-6500` | `45-180` | `flux` | `0.52/0.32/0.16` | `1.00/0.00` | `False` | 0.651 | 0.606 | 0.744 | 3.351 | 0.541 |
| `onset_flux_mid_hi_norm_refine_08` | `dual_weighted` | `1200-10000` | `45-180` | `flux` | `0.52/0.32/0.16` | `0.74/0.26` | `False` | 0.631 | 0.541 | 0.746 | 3.398 | 0.547 |
| `onset_flux_mid_hi_norm_refine_10` | `dual_weighted` | `1400-11000` | `45-160` | `flux` | `0.52/0.32/0.16` | `0.72/0.28` | `False` | 0.630 | 0.543 | 0.743 | 3.275 | 0.543 |
| `onset_flux_mid_hi_norm_refine_03` | `dual_weighted` | `1200-9000` | `45-180` | `flux` | `0.52/0.32/0.16` | `0.70/0.30` | `False` | 0.629 | 0.535 | 0.727 | 3.787 | 0.547 |
| `onset_flux_mid_hi_norm_refine_02` | `dual_weighted` | `1000-10000` | `45-180` | `flux` | `0.52/0.32/0.16` | `0.72/0.28` | `False` | 0.627 | 0.544 | 0.743 | 2.482 | 0.538 |
| `onset_flux_mid_hi_norm_refine_05` | `dual_weighted` | `1200-10000` | `45-160` | `flux` | `0.52/0.32/0.16` | `0.70/0.30` | `False` | 0.627 | 0.534 | 0.735 | 3.200 | 0.543 |

## Best per song

- `phase_alignment_drill` -> `onset_flux_mid_hi_norm` score `0.986`
- `grid16_phrase_map` -> `onset_flux_mid_hi_norm` score `0.968`
- `tempo_transition_stress` -> `onset_flux_mid_hi_norm` score `0.962`
- `generic_reference_sample` -> `onset_flux_mid_hi_norm` score `0.967`
- `reference_live_calibration` -> `onset_flux_mid_hi_norm_refine_08` score `0.982`
- `public_free_chill_loop_95_bpm` -> `onset_flux_mid_hi_norm_refine_05` score `0.748`
- `public_ambient_piano_loop_105_bpm` -> `onset_flux_mid_hi_norm_refine_02` score `0.637`
- `public_music_loop_polaris_110_bpm` -> `onset_flux_mid_hi_norm_refine_13` score `0.738`
- `public_synth_movement_music_loop_120_bpm` -> `onset_flux_mid_hi_norm_refine_13` score `0.653`
- `public_poly_dream_synth_loop_130_bpm` -> `onset_flux_mid_hi_norm` score `0.835`
- `level_06_full_band_with_voice_120_bpm` -> `onset_flux_mid_hi_norm_refine_08` score `0.492`
- `level_07_full_song_sections_122_bpm` -> `onset_flux_mid_hi_norm` score `0.541`
- `level_10_ambiguous_half_double_time_95_bpm` -> `onset_flux_mid_hi_norm_refine_13` score `0.681`

## Suite Leaders

- `synthetic_deterministic` -> `onset_flux_mid_hi_norm` score `0.971`
- `public_bpm_loop` -> `onset_flux_mid_hi_norm_refine_01` score `0.691`
- `realistic_alignment` -> `onset_flux_mid_hi_norm_refine_04` score `0.555`
