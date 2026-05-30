# Realistic Alignment Tests

This folder contains harder listening tests designed to be more realistic than the internal deterministic benchmark songs.

## Why they exist

The beat follower should not only survive clean synthetic material.

These tests push the system with:

- denser textures
- vocal interference
- section changes
- fuller arrangements
- half-time / double-time ambiguity

## Catalog

See `catalog.json` for:

- BPM
- meter
- section layout
- source material
- local generated WAV files

## Regeneration

- `python scripts/generate_realistic_alignment_tests.py`
