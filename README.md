# Audio2VideoPal

Audio2VideoPal e' un workspace per trasformare audio e segnali ritmici in pipeline visive controllabili.

Il runtime principale vive in [F:\_CODEX\Audio2VideoPal\VisualMusic](F:/_CODEX/Audio2VideoPal/VisualMusic) ed e' una desktop app Tauri + React con:
- player MP3 locale
- inventario e scansione plugin
- listening pipeline minima con sorgente sintetica a 112 BPM
- tab dedicate per `Overview`, `System`, `Plugins`, `Control Room`, `Pipeline`, `Wiring` e `Telemetry`
- integrazione HubMail sulla mailbox condivisa `doomsdaygurki1@gmail.com`

## Struttura

- [F:\_CODEX\Audio2VideoPal\VisualMusic](F:/_CODEX/Audio2VideoPal/VisualMusic): applicazione desktop principale
- [F:\_CODEX\Audio2VideoPal\feeds](F:/_CODEX/Audio2VideoPal/feeds): feed di coordinamento e report di esecuzione
- [F:\_CODEX\Audio2VideoPal\PROJECT_BRIEF.md](F:/_CODEX/Audio2VideoPal/PROJECT_BRIEF.md): brief operativo e convenzioni progetto
- [F:\_CODEX\Audio2VideoPal\hubmail.project.json](F:/_CODEX/Audio2VideoPal/hubmail.project.json): registrazione locale del bus HubMail

## Verifica rapida

Per verificare frontend e desktop insieme:

```bash
cd VisualMusic
npm install
npm run verify
```

Il comando `verify` esegue:
- build frontend
- `cargo check` del backend desktop
- `cargo test` del backend desktop

## Note

- La preview browser della UI usa un fallback ordinato quando Tauri non e' disponibile, quindi i pannelli restano ispezionabili anche fuori dalla shell desktop.
- La telemetria runtime reale viene scritta in `VisualMusic/runtime/telemetry`, mentre i test usano una cartella temporanea separata per non sporcare il repository.
