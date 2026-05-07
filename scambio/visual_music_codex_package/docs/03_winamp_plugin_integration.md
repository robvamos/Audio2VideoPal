# Specifiche integrazione plugin Winamp

## Contesto

I plugin di visualizzazione Winamp legacy sono DLL Windows usate dall'host `winamp.exe`.

Il modello classico espone una funzione di ingresso:

- `winampVisGetHeader`

L'host ottiene un header, poi enumera moduli visual. Ogni modulo espone funzioni come:

- `Config`;
- `Init`;
- `Render`;
- `Quit`.

Il modulo riceve dati audio tipo:

- `waveformData`;
- `spectrumData`.

## Vincolo principale

Le DLL Winamp legacy non devono essere caricate nel processo principale dell'app.

Usare processo helper separato:

- helper x86 per plugin storici 32 bit;
- helper x64 per eventuali plugin moderni;
- crash isolation;
- IPC verso app principale.

## Lifecycle plugin

### Discovery

1. L'utente seleziona una cartella locale.
2. L'app cerca `.dll`.
3. Per ogni DLL calcola SHA-256.
4. Legge metadati Windows file version.
5. Determina architettura x86/x64.
6. Registra nel database.
7. Non carica la DLL nel main process.

### Inspection sicura

1. Avvia helper compatibile.
2. Helper carica DLL.
3. Verifica `winampVisGetHeader`.
4. Legge header e descrizione.
5. Enumera moduli.
6. Restituisce dati all'app.
7. App salva database.
8. Helper scarica DLL/termina.

### Start sessione

1. App congela export settings.
2. Avvia microfono o file decode.
3. Avvia helper.
4. Helper carica DLL e modulo.
5. App invia sample rate, canali, waveform/spectrum.
6. Helper chiama Init.
7. Helper chiama Render in loop.
8. App cattura output se export attivo.

### Stop

1. Ferma input audio.
2. Ferma render loop.
3. Helper chiama Quit.
4. Recorder finalizza video.
5. Sessione salvata nel database.

## Adattamento audio

L'app ascolta da microfono/file, ma il plugin si aspetta dati tipo Winamp.

Regole:

- generare waveform normalizzata;
- generare spectrum via FFT;
- simulare stereo se input mono;
- mantenere sample rate coerente;
- smoothing configurabile;
- noise gate opzionale.

## Gestione finestre/render

Livelli di integrazione:

### Livello 1 — Embedded controllato

Plugin renderizza in finestra child controllata dall'host.

### Livello 2 — Finestra separata gestita

L'app controlla posizione/dimensione della finestra plugin.

### Livello 3 — Fallback window capture

L'app cattura la finestra come sorgente video.

## Headless

Non tutti i plugin legacy supportano vero headless.

Classificare ogni plugin:

- headless reale;
- hidden window;
- requires visible window;
- preview only;
- unsupported.

## Risoluzione plugin

Classi:

### Classe A — Resolution Independent

Render diretto alla risoluzione export.

### Classe B — Window Bound Resizable

Finestra plugin dimensionabile alla risoluzione export.

### Classe C — Window Bound Fixed/Unstable

Usare risoluzione stabile e scaling.

### Classe D — Preview Only

No export affidabile.

### Classe E — Unsupported

Non usare.

## Plugin noti da tracciare

### Prioritari

- MilkDrop;
- MilkDrop 2;
- Advanced Visualization Studio / AVS;
- Geiss;
- Geiss 2;
- Goom;
- G-Force;
- WhiteCap.

### Da verificare

- Tripex / Tripex 3;
- R4;
- Climax;
- TwistedPixel;
- SoundGraffiti;
- Synesthesia;
- Nullsoft Tiny Fullscreen;
- Monkey;
- Jet.

### Moderni/derivati

- MilkDrop 3;
- BeatDrop;
- BeatDrop2077;
- projectM;
- Butterchurn.

## Sicurezza

- non scaricare DLL automaticamente;
- caricare solo da cartelle scelte dall'utente;
- mostrare path e hash;
- permettere blocklist;
- usare helper con privilegi minimi;
- timeout su Init/Render;
- registrare crash;
- opzionale: antivirus/signature check.
