# Specifiche funzionali

## Input audio

Supporto minimo:

- microfono;
- WAV;
- MP3;
- OGG Vorbis;
- OGG Opus, se supportato dal backend;
- FLAC;
- AAC/M4A, se supportato dal backend.

Supporto futuro:

- loopback di sistema;
- ASIO;
- WASAPI exclusive/shared;
- playlist batch;
- cartella batch;
- MIDI/OSC.

## Output video

Parametri configurabili:

- export abilitato sì/no;
- risoluzione;
- fps;
- bitrate;
- codec video;
- codec audio;
- container;
- inclusione audio sì/no;
- nome file;
- cartella destinazione.

## Preset export

### Bozza veloce

- 854x480 o 1280x720;
- 24/30 fps;
- H.264 hardware o x264 fast;
- bitrate basso.

### HD compatibile

- 1280x720;
- 30 fps;
- H.264 + AAC;
- MP4.

### Full HD standard

- 1920x1080;
- 30/60 fps;
- H.264 + AAC;
- MP4.

### Alta compressione

- HEVC o AV1;
- bitrate più basso;
- encoding più lento se software.

### Editing qualità alta

- ProRes o DNxHR;
- audio PCM/FLAC;
- MOV/MKV;
- file grandi.

### Web open

- WebM VP9/AV1 + Opus.

## UI principale

- Start;
- Stop;
- modalità input;
- selezione microfono/file;
- selezione visualizer;
- export enable, modificabile solo prima dello Start;
- risoluzione export;
- fps;
- bitrate;
- codec/container;
- preview on/off;
- stato sessione;
- metriche performance.

## UI plugin Winamp

- seleziona cartella plugin;
- scansione DLL;
- elenco plugin;
- hash;
- architettura x86/x64;
- versione file;
- descrizione;
- moduli disponibili;
- stato compatibilità;
- test load/init/render/capture/export;
- configura;
- blocca plugin;
- dettagli tecnici.
