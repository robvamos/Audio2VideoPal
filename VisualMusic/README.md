# VisualMusic

VisualMusic e' la desktop app principale di Audio2VideoPal, costruita con Tauri, React, TypeScript e Rust.

## Stato attuale

L'app include oggi:
- `Player` per playlist e preview MP3
- `System` per database e diagnostica FFmpeg
- `Plugins` per inventory e deep scan
- `Control Room` per avvio listening, test sintetico e gate del video
- `Pipeline` per la vista a stadi della listening pipeline
- `Wiring` per moduli attivi, disattivi ed edge
- `Telemetry` per run id, artifact path e raccomandazioni

La listening pipeline minima usa il profilo `minimal_one_bar_grid` con sorgente `synthetic_pattern` a 112 BPM.

## Sviluppo

```bash
npm install
npm run dev
```

Per il runtime desktop:

```bash
npm run tauri dev
```

## Verifica

```bash
npm run verify
```

Il comando esegue:
- `npm run build`
- `npm run check:desktop`
- `npm run test:desktop`

## Note operative

- Se apri la UI solo nel browser, l'app entra in modalita' preview e mostra un messaggio esplicito invece di fallire sulle chiamate Tauri.
- I test Rust scrivono la telemetria in una cartella temporanea, quindi il repository rimane pulito dopo le verifiche.
