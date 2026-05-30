# Benchmark Sweep

Generated: `2026-05-30T11:00:10`
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
- overall score: `0.717`
- robustness score: `0.641`
- suite floor: `0.589`
- song floor: `0.501`
- robust songs >= 0.65: `10` / `13`
- mean grid score: `0.377`
- mean musical grid score: `0.559`
- mean downbeat score: `0.591`
- mean BPM abs error: `1.589`

## Top candidates

| candidate | mode | onset band | low band | profile | listen mem | weights | guard | robust | suite floor | musical | downbeat | overall | bpm err | grid |
|---|---|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| `onset_hybrid_guard` | `onset_only` | `700-8000` | `45-180` | `hybrid` | `0.42/0.38/0.20` | `1.00/0.00` | `True` | 0.641 | 0.589 | 0.559 | 0.591 | 0.717 | 1.589 | 0.377 |
| `onset_hybrid_guard_refine_03` | `dual_weighted` | `1200-9000` | `45-180` | `hybrid` | `0.42/0.38/0.20` | `0.70/0.30` | `True` | 0.609 | 0.560 | 0.558 | 0.515 | 0.710 | 2.885 | 0.410 |
| `onset_hybrid_guard_refine_11` | `dual_weighted` | `1100-10000` | `45-180` | `hybrid` | `0.40/0.38/0.22` | `0.70/0.30` | `True` | 0.607 | 0.546 | 0.558 | 0.514 | 0.714 | 2.707 | 0.411 |
| `onset_hybrid_guard_refine_10` | `dual_weighted` | `1400-11000` | `45-160` | `hybrid` | `0.42/0.38/0.20` | `0.72/0.28` | `True` | 0.606 | 0.570 | 0.553 | 0.512 | 0.713 | 4.801 | 0.401 |
| `onset_hybrid_guard_refine_05` | `dual_weighted` | `1200-10000` | `45-160` | `hybrid` | `0.42/0.38/0.20` | `0.70/0.30` | `True` | 0.602 | 0.572 | 0.550 | 0.502 | 0.705 | 4.259 | 0.403 |
| `onset_hybrid_guard_refine_08` | `dual_weighted` | `1200-10000` | `45-180` | `hybrid` | `0.42/0.38/0.20` | `0.74/0.26` | `True` | 0.601 | 0.562 | 0.559 | 0.520 | 0.706 | 4.421 | 0.408 |

## Best per song

- `phase_alignment_drill` -> `onset_hybrid_guard_refine_08` score `0.911`
- `grid16_phrase_map` -> `onset_hybrid_guard_refine_08` score `0.900`
- `tempo_transition_stress` -> `onset_hybrid_guard_refine_08` score `0.897`
- `generic_reference_sample` -> `onset_hybrid_guard_refine_08` score `0.908`
- `reference_live_calibration` -> `onset_hybrid_guard_refine_08` score `0.919`
- `public_free_chill_loop_95_bpm` -> `onset_hybrid_guard` score `0.756`
- `public_ambient_piano_loop_105_bpm` -> `onset_hybrid_guard` score `0.721`
- `public_music_loop_polaris_110_bpm` -> `onset_hybrid_guard` score `0.841`
- `public_synth_movement_music_loop_120_bpm` -> `onset_hybrid_guard_refine_12` score `0.659`
- `public_poly_dream_synth_loop_130_bpm` -> `onset_hybrid_guard` score `0.704`
- `level_06_full_band_with_voice_120_bpm` -> `onset_hybrid_guard_refine_05` score `0.544`
- `level_07_full_song_sections_122_bpm` -> `onset_hybrid_guard` score `0.597`
- `level_10_ambiguous_half_double_time_95_bpm` -> `onset_hybrid_guard_refine_05` score `0.691`

## Suite Leaders

- `synthetic_deterministic` -> `onset_hybrid_guard_refine_08` score `0.907`
- `public_bpm_loop` -> `onset_hybrid_guard` score `0.734`
- `realistic_alignment` -> `onset_hybrid_guard` score `0.589`
