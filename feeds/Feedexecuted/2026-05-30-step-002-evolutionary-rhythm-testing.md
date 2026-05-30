# Step 002 - Evolutionary Rhythm Testing and Harmony Feed

## What was interpreted

The feed asked to shift the project from plain BPM-centric optimization toward a more musical model that separates:

- tempo tracking
- phase tracking
- downbeat tracking
- form tracking

It also asked to:

- avoid letting one combined signal decide everything
- give more weight to downbeat and musical grid quality
- prepare a harmonic branch as a later evidence source
- write graph observations from actual runs

## Files read

- `feeds/incoming/20260530-chatgpt-evolutionary-rhythm-testing-and-harmony-feed.md`
- `VisualMusic/scripts/run_benchmark_sweep.py`
- `VisualMusic/runtime/benchmark-sweeps/latest.benchmark-sweep.md`
- `VisualMusic/configs/listening.benchmark-sweep.recommended.json`

## Changes made

- updated the sweep script to compute `phase_score` and `musical_grid_score`
- changed candidate ordering so musical-grid quality matters directly
- updated reports and preset summaries with musical-grid and downbeat data
- added automatic graph-observation emission in `runtime/graph-observations/`
- created `VisualMusic/experiments/20260530-harmonic-downbeat-hints.json`
- created `VisualMusic/docs/evolutionary-rhythm-testing-roadmap.md`

## Inferences produced

- the feed is right that BPM-only optimization is no longer enough for the project stage
- the safest immediate execution was to strengthen scoring and data exhaust first, before implementing a full harmonic branch
- graph observations are a low-risk way to make learning cumulative before deeper model changes

## Confidence level

- medium-high on the scoring and graph-observation slice
- medium on the roadmap assumptions
- intentionally not claiming completion for the future harmonic modules

## Conflicts detected

- none in repository state
- no merge conflict after fast-forward pull

## Residual TODOs

- implement `DownbeatHypothesisTracker`
- implement `HarmonicHintBranch`
- extend test library with more realistic full-band and vocal material
- integrate graph observations into UI and promotion logic

## Generated images

- none

## Updated models

- benchmark model now separates overall and musical-grid logic
- graph-learning model now receives automatic observations from sweep runs
- experiment model introduced for harmonic/downbeat work
