# Benchmark Sweep

Generated: `2026-05-29T23:15:54`

## Recommended candidate

- id: `onset_only_norm`
- mode: `onset_only`
- onset / low-band: `1.00 / 0.00`
- normalize: `True`
- tonality guard: `False`
- overall score: `0.976`
- mean grid score: `0.951`
- mean BPM abs error: `0.541`

## Top candidates

| candidate | mode | onset | low | normalize | tonal guard | overall | bpm err | grid | pause |
|---|---|---:|---:|---|---|---:|---:|---:|---:|
| `onset_only_norm` | `onset_only` | 1.00 | 0.00 | `True` | `False` | 0.976 | 0.541 | 0.951 | 1.000 |
| `blend_onset_65_guard` | `dual_weighted` | 0.65 | 0.35 | `True` | `True` | 0.962 | 0.699 | 0.955 | 1.000 |
| `blend_onset_65` | `dual_weighted` | 0.65 | 0.35 | `True` | `False` | 0.962 | 0.699 | 0.952 | 1.000 |
| `blend_balanced_wide` | `dual_weighted` | 0.58 | 0.42 | `True` | `True` | 0.962 | 0.683 | 0.955 | 1.000 |
| `blend_balanced_tight` | `dual_weighted` | 0.58 | 0.42 | `True` | `False` | 0.960 | 0.699 | 0.952 | 1.000 |
| `blend_even_norm` | `dual_weighted` | 0.50 | 0.50 | `True` | `False` | 0.960 | 0.662 | 0.952 | 1.000 |

## Best per song

- `phase_alignment_drill` -> `onset_only_norm` score `0.986`
- `grid16_phrase_map` -> `onset_only_norm` score `0.967`
- `tempo_transition_stress` -> `onset_only_norm` score `0.979`
- `generic_reference_sample` -> `onset_only_norm` score `0.967`
- `reference_live_calibration` -> `onset_only_norm` score `0.982`
