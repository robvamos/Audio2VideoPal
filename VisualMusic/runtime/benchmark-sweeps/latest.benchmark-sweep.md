# Benchmark Sweep

Generated: `2026-05-30T01:31:27`
Analysis version: `band-aware-v2`

## Recommended candidate

- id: `blend_hfc_kick_fast`
- mode: `dual_weighted`
- onset / low-band weights: `0.70 / 0.30`
- onset band: `1200-10000 Hz`
- low band: `45-180 Hz`
- onset profile: `hfc`
- normalize: `True`
- tonality guard: `False`
- overall score: `0.873`
- mean grid score: `0.819`
- mean BPM abs error: `0.541`

## Top candidates

| candidate | mode | onset band | low band | profile | weights | guard | overall | bpm err | grid |
|---|---|---|---|---|---|---|---:|---:|---:|
| `blend_hfc_kick_fast` | `dual_weighted` | `1200-10000` | `45-180` | `hfc` | `0.70/0.30` | `False` | 0.873 | 0.541 | 0.819 |
| `onset_hfc_bright_norm` | `onset_only` | `1200-10000` | `45-180` | `hfc` | `1.00/0.00` | `False` | 0.861 | 0.541 | 0.820 |
| `blend_balanced_guarded` | `dual_weighted` | `500-7000` | `45-180` | `hybrid` | `0.56/0.44` | `True` | 0.855 | 0.851 | 0.812 |
| `onset_hybrid_guard` | `onset_only` | `700-8000` | `45-180` | `hybrid` | `1.00/0.00` | `True` | 0.852 | 0.541 | 0.813 |
| `blend_flux_kick_guard` | `dual_weighted` | `700-6500` | `45-180` | `flux` | `0.64/0.36` | `True` | 0.852 | 0.851 | 0.811 |
| `blend_balanced_melflux` | `dual_weighted` | `500-7000` | `45-180` | `flux` | `0.58/0.42` | `False` | 0.847 | 0.640 | 0.818 |

## Best per song

- `phase_alignment_drill` -> `onset_hfc_bright_norm` score `0.946`
- `grid16_phrase_map` -> `blend_hfc_kick_fast` score `0.844`
- `tempo_transition_stress` -> `blend_hfc_kick_fast` score `0.846`
- `generic_reference_sample` -> `blend_hfc_kick_fast` score `0.845`
- `reference_live_calibration` -> `blend_hfc_kick_fast` score `0.910`
