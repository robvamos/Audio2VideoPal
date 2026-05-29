# Benchmark Sweep

Generated: `2026-05-30T01:58:10`
Analysis version: `band-aware-v3`

## Recommended candidate

- id: `blend_hfc_kick_fast_refine_07`
- mode: `dual_weighted`
- onset / low-band weights: `0.66 / 0.34`
- onset band: `1200-10000 Hz`
- low band: `45-180 Hz`
- onset profile: `hfc`
- normalize: `True`
- tonality guard: `False`
- overall score: `0.874`
- mean grid score: `0.820`
- mean BPM abs error: `0.541`

## Top candidates

| candidate | mode | onset band | low band | profile | weights | guard | overall | bpm err | grid |
|---|---|---|---|---|---|---|---:|---:|---:|
| `blend_hfc_kick_fast_refine_07` | `dual_weighted` | `1200-10000` | `45-180` | `hfc` | `0.66/0.34` | `False` | 0.874 | 0.541 | 0.820 |
| `blend_hfc_kick_fast_refine_04` | `dual_weighted` | `1200-11000` | `45-180` | `hfc` | `0.70/0.30` | `False` | 0.874 | 0.541 | 0.820 |
| `blend_hfc_kick_fast` | `dual_weighted` | `1200-10000` | `45-180` | `hfc` | `0.70/0.30` | `False` | 0.873 | 0.541 | 0.819 |
| `blend_hfc_kick_fast_refine_03` | `dual_weighted` | `1200-9000` | `45-180` | `hfc` | `0.70/0.30` | `False` | 0.873 | 0.541 | 0.819 |
| `blend_hfc_kick_fast_refine_08` | `dual_weighted` | `1200-10000` | `45-180` | `hfc` | `0.74/0.26` | `False` | 0.873 | 0.541 | 0.819 |
| `blend_hfc_kick_fast_refine_01` | `dual_weighted` | `1000-10000` | `45-180` | `hfc` | `0.68/0.32` | `False` | 0.868 | 0.541 | 0.818 |

## Best per song

- `phase_alignment_drill` -> `blend_hfc_kick_fast_refine_08` score `0.924`
- `grid16_phrase_map` -> `blend_hfc_kick_fast_refine_07` score `0.845`
- `tempo_transition_stress` -> `blend_hfc_kick_fast_refine_07` score `0.849`
- `generic_reference_sample` -> `blend_hfc_kick_fast_refine_07` score `0.846`
- `reference_live_calibration` -> `blend_hfc_kick_fast_refine_07` score `0.912`
