# Benchmark Sweep

Generated: `2026-05-30T03:12:25`
Analysis version: `band-aware-v3`

## Recommended candidate

- id: `blend_balanced_guarded_refine_04`
- mode: `dual_weighted`
- onset / low-band weights: `0.70 / 0.30`
- onset band: `1200-11000 Hz`
- low band: `45-180 Hz`
- onset profile: `hybrid`
- normalize: `True`
- tonality guard: `True`
- overall score: `0.875`
- mean grid score: `0.812`
- mean musical grid score: `0.748`
- mean downbeat score: `0.520`
- mean BPM abs error: `0.699`

## Top candidates

| candidate | mode | onset band | low band | profile | weights | guard | musical | downbeat | overall | bpm err | grid |
|---|---|---|---|---|---|---|---:|---:|---:|---:|---:|
| `blend_balanced_guarded_refine_04` | `dual_weighted` | `1200-11000` | `45-180` | `hybrid` | `0.70/0.30` | `True` | 0.748 | 0.520 | 0.875 | 0.699 | 0.812 |
| `blend_balanced_guarded_refine_08` | `dual_weighted` | `1200-10000` | `45-180` | `hybrid` | `0.74/0.26` | `True` | 0.748 | 0.521 | 0.873 | 0.699 | 0.811 |
| `blend_balanced_guarded_refine_03` | `dual_weighted` | `1200-9000` | `45-180` | `hybrid` | `0.70/0.30` | `True` | 0.747 | 0.518 | 0.871 | 0.699 | 0.812 |
| `blend_balanced_guarded_refine_07` | `dual_weighted` | `1200-10000` | `45-180` | `hybrid` | `0.66/0.34` | `True` | 0.745 | 0.515 | 0.872 | 0.699 | 0.809 |
| `blend_balanced_guarded_refine_01` | `dual_weighted` | `1000-10000` | `45-180` | `hybrid` | `0.68/0.32` | `True` | 0.738 | 0.494 | 0.869 | 0.699 | 0.812 |
| `blend_balanced_guarded_refine_02` | `dual_weighted` | `1000-10000` | `45-180` | `hybrid` | `0.72/0.28` | `True` | 0.735 | 0.486 | 0.868 | 0.699 | 0.811 |

## Best per song

- `phase_alignment_drill` -> `blend_balanced_guarded_refine_06` score `0.903`
- `grid16_phrase_map` -> `blend_balanced_guarded_refine_04` score `0.848`
- `tempo_transition_stress` -> `blend_balanced_guarded_refine_04` score `0.848`
- `generic_reference_sample` -> `blend_balanced_guarded_refine_04` score `0.856`
- `reference_live_calibration` -> `blend_balanced_guarded_refine_04` score `0.923`
