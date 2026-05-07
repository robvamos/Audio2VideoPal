# Visual Music App — Codex Project Pack

## Obiettivo

Creare un'applicazione Windows 11 capace di generare visualizzazioni grafiche dinamiche a partire da:

- microfono live;
- file audio `.mp3`, `.ogg`, `.wav`, `.flac`, `.aac/.m4a`;
- in futuro loopback audio di sistema, ASIO/WASAPI, MIDI/OSC.

L'app deve poter:

- mostrare una preview live;
- generare video senza preview, in modalità headless/batch;
- esportare video compresso;
- usare visualizer nativi moderni;
- usare preset compatibili MilkDrop/projectM;
- integrare, in seconda fase, plugin visual Winamp legacy `.dll`;
- tracciare plugin, test, sessioni, export, codec e performance in un database locale.

## Principio vincolante export

L'export video può essere attivato solo prima dello Start.

Durante una sessione:

- non si può abilitare l'export se non era già armato;
- non si possono modificare risoluzione, fps, bitrate, codec e formato;
- se export non era abilitato allo Start, la sessione produce solo grafica live.

## Target primario

- Windows 11.
- App desktop performante.
- UI moderna.
- Core multithread.
- Pipeline rendering/audio/video ottimizzata.

## Stack consigliato

### Raccomandato

- UI: Tauri + React + TypeScript + Tailwind + Framer Motion.
- Core: Rust.
- Database: SQLite.
- Encoder/decoder: FFmpeg.
- Rendering moderno: projectM + motore visualizer nativo GPU.
- Plugin Winamp legacy: helper nativo separato, preferibilmente x86.
- IPC: shared memory + message bus async.

### Alternative

- Avalonia UI + .NET per UI desktop professionale.
- Qt/QML + C++ per massima integrazione nativa e rendering.
- Electron solo se si accetta overhead elevato; non consigliato come prima scelta.
