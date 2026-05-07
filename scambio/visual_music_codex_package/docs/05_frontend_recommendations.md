# Raccomandazioni frontend Windows performante

## Scelta consigliata

### Tauri + React + TypeScript + Tailwind + Framer Motion

Motivazioni:

- più leggero di Electron;
- UI moderna;
- backend Rust performante;
- ottimo per orchestrare processi helper;
- buono per Windows 11;
- adatto a gestione DB, FFmpeg, IPC.

## UI design

### Layout

- sidebar sinistra: input, visualizer, export;
- area centrale: preview opzionale;
- pannello destro: metadati plugin/job;
- bottom bar: stato sessione, fps, encoder, CPU/GPU;
- schermata dedicata plugin manager;
- schermata batch queue.

### Performance UI

- virtualizzazione liste plugin/sessioni;
- aggiornamenti metriche throttled;
- preview disattivabile;
- niente rendering canvas pesante nel DOM se il rendering è GPU/nativo;
- UI sempre separata dal render thread.

### Windows 11 look

- tema dark;
- pannelli rounded;
- effetto Mica/Acrylic se stack lo supporta;
- DPI aware;
- multi-monitor;
- salvataggio layout finestre.

## Alternative

### Avalonia UI + .NET

Ottima per app professionale Windows, MVVM, UI fluida.

### Qt/QML + C++

Molto potente per rendering nativo, ma più complesso e licensing da valutare.

### Electron

Sconsigliato come prima scelta per performance, ma possibile per prototipo UI.
