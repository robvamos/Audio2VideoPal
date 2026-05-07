# Skill: Realtime Audio Analysis

## Purpose

Implement microphone/file audio analysis for visual rendering.

## Outputs

- waveform;
- spectrum;
- RMS/volume;
- bass/mid/high energy;
- peak/transient events;
- beat estimate;
- noise floor.

## Guidance

- Use FFT with configurable size.
- Smooth data to avoid jitter.
- Support mono-to-stereo simulation for Winamp plugins.
- For batch rendering, derive analysis by timestamp deterministically.
- For realtime, prioritize low latency and stable frame pacing.
