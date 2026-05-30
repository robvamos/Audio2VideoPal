# Benchmark Sweep

Generated: `2026-05-30T04:37:54`
Analysis version: `band-aware-v6-memory-realistic-bpm80-130`
Evaluation suites: `{'synthetic_deterministic': 5, 'public_bpm_loop': 5, 'realistic_alignment': 3}`
Tracking BPM range: `80-130`

## Recommended candidate

- id: `onset_hybrid_guard`
- mode: `onset_only`
- onset / low-band weights: `1.00 / 0.00`
- listening memory weights: `0.42 / 0.38 / 0.20`
- onset band: `700-8000 Hz`
- low band: `45-180 Hz`
- onset profile: `hybrid`
- normalize: `True`
- tonality guard: `True`
- overall score: `0.725`
- robustness score: `0.661`
- suite floor: `0.589`
- song floor: `0.509`
- robust songs >= 0.65: `11` / `13`
- mean grid score: `0.377`
- mean musical grid score: `0.579`
- mean downbeat score: `0.649`
- mean BPM abs error: `1.589`

## Top candidates

| candidate | mode | onset band | low band | profile | listen mem | weights | guard | robust | suite floor | musical | downbeat | overall | bpm err | grid |
|---|---|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| `onset_hybrid_guard` | `onset_only` | `700-8000` | `45-180` | `hybrid` | `0.42/0.38/0.20` | `1.00/0.00` | `True` | 0.661 | 0.589 | 0.579 | 0.649 | 0.725 | 1.589 | 0.377 |
| `onset_hybrid_guard_refine_03` | `dual_weighted` | `1200-9000` | `45-180` | `hybrid` | `0.42/0.38/0.20` | `0.70/0.30` | `True` | 0.607 | 0.555 | 0.566 | 0.523 | 0.712 | 2.885 | 0.410 |
| `onset_hybrid_guard_refine_11` | `dual_weighted` | `1100-10000` | `45-180` | `hybrid` | `0.40/0.38/0.22` | `0.70/0.30` | `True` | 0.604 | 0.541 | 0.566 | 0.524 | 0.716 | 2.707 | 0.411 |
| `onset_hybrid_guard_refine_10` | `dual_weighted` | `1400-11000` | `45-160` | `hybrid` | `0.42/0.38/0.20` | `0.72/0.28` | `True` | 0.603 | 0.565 | 0.561 | 0.521 | 0.714 | 4.801 | 0.401 |
| `onset_hybrid_guard_refine_05` | `dual_weighted` | `1200-10000` | `45-160` | `hybrid` | `0.42/0.38/0.20` | `0.70/0.30` | `True` | 0.599 | 0.567 | 0.558 | 0.510 | 0.706 | 4.259 | 0.403 |
| `onset_hybrid_guard_refine_08` | `dual_weighted` | `1200-10000` | `45-180` | `hybrid` | `0.42/0.38/0.20` | `0.74/0.26` | `True` | 0.599 | 0.556 | 0.567 | 0.530 | 0.708 | 4.421 | 0.408 |

## Best per song

- `phase_alignment_drill` -> `onset_hybrid_guard_refine_08` score `0.924`
- `grid16_phrase_map` -> `onset_hybrid_guard_refine_08` score `0.906`
- `tempo_transition_stress` -> `onset_hybrid_guard_refine_08` score `0.904`
- `generic_reference_sample` -> `onset_hybrid_guard_refine_08` score `0.916`
- `reference_live_calibration` -> `onset_hybrid_guard_refine_08` score `0.926`
- `public_free_chill_loop_95_bpm` -> `onset_hybrid_guard` score `0.762`
- `public_ambient_piano_loop_105_bpm` -> `onset_hybrid_guard` score `0.734`
- `public_music_loop_polaris_110_bpm` -> `onset_hybrid_guard` score `0.857`
- `public_synth_movement_music_loop_120_bpm` -> `onset_hybrid_guard` score `0.664`
- `public_poly_dream_synth_loop_130_bpm` -> `onset_hybrid_guard` score `0.699`
- `level_06_full_band_with_voice_120_bpm` -> `onset_hybrid_guard_refine_05` score `0.539`
- `level_07_full_song_sections_122_bpm` -> `onset_hybrid_guard` score `0.592`
- `level_10_ambiguous_half_double_time_95_bpm` -> `onset_hybrid_guard_refine_05` score `0.686`

## Suite Leaders

- `synthetic_deterministic` -> `onset_hybrid_guard_refine_08` score `0.915`
- `public_bpm_loop` -> `onset_hybrid_guard` score `0.743`
- `realistic_alignment` -> `onset_hybrid_guard` score `0.589`
