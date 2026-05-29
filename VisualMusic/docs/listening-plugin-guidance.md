# Listening Plugin Guidance

This note captures the current listening-only interpretation of the installed analysis plugins in the benchmark sweep.

## Roles

- `onset_strength`
  - Best used as the fast transient detector.
  - Most useful for hats, clicks, snare edges, attack clarity, re-lock after tempo changes, and beat grid reconstruction.
  - Current best profile in our sweep: bright `hfc`-style emphasis on roughly `1200-10000 Hz`.

- `low_band_pulse`
  - Best used as the kick and pulse stabilizer.
  - Most useful for reinforcing the perceived beat when the kick carries the groove or when the onset stream is too bright or sparse on its own.
  - Current useful range in our sweep: roughly `45-180 Hz`.

## Current recommendation

- Primary mode: `dual_weighted`
- Onset / low-band weights: `0.66 / 0.34`
- Onset band: `1200-10000 Hz`
- Low band: `45-180 Hz`
- Onset profile: `hfc`
- Input normalization: `enabled`
- Tonality guard: `disabled` for the current synthetic benchmark set

## Interpretation

- The onset plugin is currently the main timing leader.
- The low-band plugin is not winning alone, but it improves the best combined setup once the detector becomes band-aware.
- This means the low-band branch is acting less like a standalone tracker and more like a confidence and pulse reinforcement layer.

## Next follow-up

- Re-test on less synthetic material and on files with stronger tonal drift.
- Re-open guarded variants when harmonic masking starts to create false beat triggers.
- Add per-song comparison views in the app so the user can see where the `0.66 / 0.34` fusion wins or loses against onset-only.
