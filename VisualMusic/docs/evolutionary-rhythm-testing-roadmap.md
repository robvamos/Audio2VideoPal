# Evolutionary Rhythm Testing Roadmap

This roadmap translates the 2026-05-30 incoming ChatGPT feed into executable next steps.

## Immediate changes already applied

- benchmark sweep now tracks a separate `musical_grid_score`
- benchmark sweep now emits graph observations into `runtime/graph-observations/`
- harmonic and downbeat evolution work now has an experiment descriptor

## Next execution slices

### 1. DownbeatHypothesisTracker

Goal:

- stop treating downbeat as a single strong peak
- maintain four competing bar-phase hypotheses

Expected evidence inputs:

- onset accents
- low-band kick reinforcement
- pause-before-hit behavior
- pattern repetition over several bars
- future harmonic loop return hints

### 2. HarmonicHintBranch

Goal:

- add harmonic evidence without using it as a BPM detector

Planned modules:

- `ChromaExtractor`
- `ChordChangeDetector`
- `HarmonicNoveltyDetector`
- `KeyMemoryTracker`
- `ChordLoopTracker`

Suggested initial weights:

- BPM tracking: `0.00`
- phase tracking: `0.05`
- downbeat tracking: `0.10`
- phrase / giro tracking: `0.20-0.30`

### 3. Harder test library

Add levels beyond synthetic clean material:

- drum loops with dense hi-hat
- bass + drums
- full-band without voice
- full-band with voice
- section boundaries
- harmonic loop return tests
- ambiguous half/double-time cases

### 4. Graph-fed learning

Every run should keep producing:

- `observations`
- future promotion candidates for `confirmed_memory`
- explicit `exceptions` when priors fail

## Design rule

The system should evolve from:

`tempo only`

toward:

`tempo -> phase -> downbeat -> bar cycle -> phrase -> section`
