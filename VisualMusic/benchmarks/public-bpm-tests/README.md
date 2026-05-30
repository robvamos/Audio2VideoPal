# Public BPM Tests

This folder contains external public loops with declared BPM values gathered from the internet for listening-pipeline tests.

## Purpose

Use this set to complement the internal synthetic benchmark library with public material that already declares tempo on the source page.

## Contents

- `source-mp3/`
  - original downloaded files
- `audio-wav/`
  - mono 44.1 kHz WAV conversions for local analysis
- `catalog.json`
  - BPM, source page, direct download, license, and local paths

## Current source policy

- public source page
- declared BPM on the page
- explicit reuse license
- direct local copy kept in the repository for stable repeated testing

## Important note

These are not the same as the deterministic in-house benchmark songs. They are an external validation set meant to pressure-test the listening strategy on non-synthetic material.
