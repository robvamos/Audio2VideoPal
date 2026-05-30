# Listening Support Graph

This support graph is the durable memory layer for listening strategy decisions.

Artifacts:

- graph data: `VisualMusic/knowledge/listening-support-graph.json`
- plugin guidance: `VisualMusic/docs/listening-plugin-guidance.md`
- recommended preset: `VisualMusic/configs/listening.benchmark-sweep.recommended.json`

## Why this exists

We now have enough moving parts that the listening strategy should not live only in reports or short notes.

The graph keeps track of:

- which plugin does what best
- which frequency band supports that role
- which metrics each branch tends to improve
- which failure modes suggest strategy changes
- which preset is currently elected by the benchmark sweep
- which quarter, bar-cycle, and section-phase patterns should become learnable memory
- which genre-typical bar sequences are worth testing as prior structural memory

## Current reading

- `onset_strength` is the timing leader for grid and re-lock.
- `low_band_pulse` is the stabilizer for kick-driven pulse support.
- the current winner is a `0.66 / 0.34` weighted fusion
- `hfc`-style bright onset emphasis is currently the strongest onset profile on the benchmark set
- the graph is now ready to remember quarter roles, 2-bar and 4-bar repetition, and larger song phase
- the graph now also stores common genre priors for blues, rock, pop, funk, and metal

## Genre priors now encoded

- `blues`
  - 12-bar cycle memory
  - tonic / subdominant / dominant tension flow
  - turnaround expectation on bar 12

- `rock`
  - 2-bar and 4-bar riff logic
  - verse / chorus / bridge organization
  - solo break as common contrast area

- `pop`
  - verse / pre-chorus / chorus logic
  - frequent 8-bar section framing
  - common full-cycle section order from intro to final chorus

- `funk`
  - 1-bar vamp memory
  - quarter-by-quarter meaning inside the bar, especially beat 1 as anchor
  - accumulation from single-bar groove into 2-bar and 4-bar feel

- `metal`
  - repeated 2-bar riff cells
  - syncopated weight and low-end persistence
  - contrast sections such as breakdowns and solo breaks

## Intended use

Use this graph when:

- choosing new sweep candidates
- deciding which branch to trust more for a given song family
- explaining why a preset won
- preparing UI panels that need compact expert guidance
- reasoning about whether the system is aligned only to tempo or also to musical phase
- asking which form prior should be tested before the system has enough song-specific memory

## Next extensions

- store per-song strengths and weaknesses as graph edges
- attach real file families, not only synthetic benchmarks
- let the app surface graph facts directly in `Learning Lab` and `Puzzle Mappa`
- promote learned verse / chorus / refrain transitions into the graph as reusable section-memory facts
- connect real detected section boundaries back into these genre priors so the graph can move from “common form” to “this song’s actual form”
