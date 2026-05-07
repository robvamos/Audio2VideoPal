# Architettura generale

## Componenti principali

```text
+---------------------------------------------------------+
| Visual Music Main App 64 bit                            |
| UI / Session Controller / DB / Job Manager              |
+----------------------+----------------------------------+
                       |
                       | IPC / shared memory / command bus
                       |
+----------------------+------------------+     +---------+
| Audio Engine                            |     | SQLite  |
| Microphone / File Decode / Analysis     |     | DB      |
+----------------------+------------------+     +---------+
                       |
                       v
+----------------------+------------------+
| Visual Engine                           |
| Native visualizers / projectM / output  |
+----------------------+------------------+
                       |
                       v
+----------------------+------------------+
| Video Export Engine                     |
| FFmpeg / hardware encoders / muxing     |
+-----------------------------------------+

Optional legacy path:

+---------------------------------------------------------+
| Winamp Plugin Host Helper x86/x64                       |
| Load DLL / Init / Render / Quit / Window capture        |
+---------------------------------------------------------+
```

## Thread/process model

### Thread UI

- gestione interfaccia;
- progress bar;
- start/stop/cancel;
- dashboard performance;
- gestione plugin.

### Thread Audio Input/Decode

- microfono;
- decoding file audio;
- buffering.

### Thread Audio Analysis

- waveform;
- spectrum;
- FFT;
- smoothing;
- beat/transient detection;
- noise gate.

### Thread Render

- visualizer nativo;
- projectM;
- frame generation;
- offscreen rendering;
- plugin proxy.

### Thread Encode

- encoding video;
- mux audio/video;
- gestione FFmpeg.

### Processi helper

- `winamp_host_x86.exe` per DLL storiche 32 bit;
- `winamp_host_x64.exe` per DLL 64 bit, se necessario;
- helper separato per crash isolation.

## Modalità operative

### Live Preview Only

Microfono -> analisi -> rendering a schermo. Nessun salvataggio.

### Live Preview + Export

Microfono -> analisi -> rendering live + recorder. Export armato prima dello Start.

### Headless Microphone Export

Microfono -> analisi -> render offscreen -> encoder. Nessuna preview obbligatoria.

### Batch Audio File Render

File audio -> decode -> analisi per timestamp -> render offscreen -> encoder/mux.

## Requisiti di performance

- separazione UI/audio/render/encode;
- preview disattivabile;
- render offscreen;
- hardware encoding quando disponibile;
- code/buffer tra moduli;
- metriche di frame time, encode time e dropped frames;
- fallback automatico risoluzione/qualità se il realtime non regge.
