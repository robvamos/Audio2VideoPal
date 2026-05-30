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

## Current reading

- `onset_strength` is the timing leader for grid and re-lock.
- `low_band_pulse` is the stabilizer for kick-driven pulse support.
- the current winner is a `0.66 / 0.34` weighted fusion
- `hfc`-style bright onset emphasis is currently the strongest onset profile on the benchmark set
- the graph is now ready to remember quarter roles, 2-bar and 4-bar repetition, and larger song phase

## Intended use

Use this graph when:

- choosing new sweep candidates
- deciding which branch to trust more for a given song family
- explaining why a preset won
- preparing UI panels that need compact expert guidance
- reasoning about whether the system is aligned only to tempo or also to musical phase

## Next extensions

- store per-song strengths and weaknesses as graph edges
- attach real file families, not only synthetic benchmarks
- let the app surface graph facts directly in `Learning Lab` and `Puzzle Mappa`
- promote learned verse / chorus / refrain transitions into the graph as reusable section-memory facts
