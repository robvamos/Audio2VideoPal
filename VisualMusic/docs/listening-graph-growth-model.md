# Listening Graph Growth Model

This note defines how the song-architecture graph should keep growing over time.

## Principle

The graph must not stay frozen as a static list of genre assumptions.

It should grow across multiple levels:

- micro timing
- bar role
- riff cycle
- phrase block
- section phase
- full form
- genre prior

## Buckets

The graph should separate knowledge into four buckets:

- `priors`
  - common form expectations before analyzing a specific song

- `observations`
  - things detected during one run, one benchmark, or one file analysis

- `confirmed_memory`
  - patterns confirmed enough times to become stable memory

- `exceptions`
  - important cases where a song breaks the usual genre expectation

## Why this matters

Without this separation, the graph risks confusing:

- generic musical knowledge
- one-song accidents
- actually reusable learned structure

## Growth workflow

1. Start from a genre prior.
2. Observe local evidence from timing, grid, and structure runs.
3. Record candidate bar, phrase, or section patterns as observations.
4. Promote repeated successful observations into confirmed memory.
5. Record meaningful deviations as exceptions rather than deleting the prior.

## Intended future use

This model is designed so the app can later answer questions like:

- is this only a strong beat 1 or the start of a 4-bar phrase?
- does this song behave like a normal pop section cycle or not?
- is this a stable metal riff loop or a one-off transition fill?
- are we hearing a real chorus return or just another dense bar?
