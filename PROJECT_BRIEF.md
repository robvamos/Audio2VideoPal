# Audio2VideoPal - Project Brief for Codex

## 1. Visione del progetto

Audio2VideoPal deve diventare un'applicazione capace di trasformare un audio in ingresso in un video sincronizzato, esportabile e riutilizzabile.

Obiettivo principale:

- prendere un file audio, oppure in futuro un flusso audio live;
- analizzare ritmo, energia, dinamica, battute, sezioni e variazioni;
- generare visual audio-reactive coerenti con il brano;
- esportare un video in formato standard, preferibilmente MP4 e WebM;
- mantenere una struttura progettuale chiara, documentata e adatta a essere estesa da Codex, ChatGPT e altri agenti.

Il progetto deve essere pensato come base evolutiva per una futura control room audio/video simile a JamPal: caricamento audio, visualizer, preview, export, feed tecnico e integrazione con un hub di comunicazione fra progetti.

---

## 2. Stato attuale rilevato

Il repository esiste ma al momento contiene un README molto minimale. La prima attività di Codex deve essere quindi costruire una base solida:

- struttura directory;
- documentazione tecnica;
- dipendenze;
- script di avvio;
- prototipo minimo funzionante;
- convenzioni di feed verso l'esterno.

---

## 3. Architettura desiderata ad alto livello

Codex deve proporre e implementare progressivamente questa architettura:

```text
Audio input
  -> ingestion layer
  -> audio analysis layer
  -> timeline / beat grid model
  -> visual generation layer
  -> render / export layer
  -> metadata + report + feed layer
  -> HubMail / ChatGPT / Codex communication layer
```

### 3.1 Input audio

Supportare inizialmente file locali:

- WAV;
- MP3;
- FLAC, se facilmente disponibile;
- OGG, se facilmente disponibile.

In seguito prevedere:

- input microfono;
- input browser audio;
- input da scheda audio o loopback;
- input da cartella watch.

### 3.2 Analisi audio

Moduli utili:

- caricamento audio;
- normalizzazione volume;
- estrazione durata;
- stima BPM;
- onset detection;
- beat tracking;
- energia RMS per finestra;
- centroid/spettro per reattività visiva;
- segmentazione semplice in intro/strofa/ritornello/stacco/finale;
- salvataggio di una timeline JSON.

L'output minimo dell'analisi deve essere un file come:

```json
{
  "audio_file": "examples/input/song.mp3",
  "duration_sec": 183.4,
  "estimated_bpm": 112.0,
  "beats": [0.42, 0.96, 1.49],
  "onsets": [0.12, 0.42, 0.96],
  "energy_frames": [0.1, 0.2, 0.35],
  "sections": [
    {"label": "intro", "start": 0.0, "end": 16.0},
    {"label": "verse", "start": 16.0, "end": 48.0}
  ]
}
```

### 3.3 Generazione video

Strategia iniziale consigliata:

- prototipo Python batch;
- generazione frame con OpenCV, MoviePy o libreria equivalente;
- sincronizzazione visual con beat/onset/energia;
- export con FFmpeg.

Visual minimi:

- waveform animata;
- barre spettro semplificate;
- pulsazioni sul beat;
- cambio palette/forma nei picchi di energia;
- titolo e metadata opzionali.

Strategia evolutiva:

- modalità web con React;
- visual WebGL/Canvas;
- integrazione Butterchurn o preset MilkDrop-like;
- export via browser MediaRecorder o backend FFmpeg.

---

## 4. Struttura repository consigliata

Codex deve creare o convergere verso questa struttura:

```text
Audio2VideoPal/
  README.md
  PROJECT_BRIEF.md
  HUBMAIL_FEED_SPEC.md
  CODEX_TASKS.md
  CHANGELOG.md
  .gitignore
  requirements.txt oppure package.json
  src/
    audio2videopal/
      __init__.py
      cli.py
      config.py
      audio_ingest.py
      audio_analysis.py
      timeline.py
      visual_engine.py
      renderer.py
      exporter.py
      feed_writer.py
      hubmail_client.py
  examples/
    input/
    output/
  docs/
    architecture.md
    audio_analysis.md
    video_rendering.md
    hubmail_integration.md
  tests/
    test_audio_analysis.py
    test_timeline.py
    test_feed_writer.py
  feeds/
    outgoing/
    incoming/
    archive/
    failed/
  runtime/
    logs/
    cache/
    temp/
```

Se Codex sceglie stack JavaScript/Node invece di Python, deve mantenere la stessa separazione logica.

---

## 5. Integrazione con HubMail

HubMail e' il futuro hub di comunicazione fra progetti Codex/ChatGPT/agenti. Audio2VideoPal deve essere predisposto per comunicare con HubMail tramite feed strutturati, possibilmente anche via casella email, cartelle condivise o repository Git.

### 5.1 Obiettivo HubMail

HubMail deve permettere a progetti diversi di:

- pubblicare stato avanzamento;
- dichiarare skill disponibili;
- richiedere aiuto ad altri progetti;
- ricevere istruzioni da ChatGPT o Codex;
- condividere documentazione, feed, issue e decisioni;
- mantenere una knowledge comune fra repository.

Audio2VideoPal deve diventare un nodo compatibile con questo schema.

---

## 6. Feed verso ChatGPT / Roberto / HubMail

Codex deve implementare un sistema di feed locale, testuale e versionabile.

### 6.1 Percorso principale feed outgoing

Percorso consigliato:

```text
feeds/outgoing/
```

Nome file consigliato:

```text
YYYYMMDD-HHMMSS-audio2videopal-status.json
YYYYMMDD-HHMMSS-audio2videopal-status.md
```

Il JSON e' il formato macchina. Il Markdown e' il formato leggibile per Roberto/ChatGPT.

### 6.2 Schema JSON minimo

```json
{
  "schema_version": "1.0",
  "project": "Audio2VideoPal",
  "repo": "robvamos/Audio2VideoPal",
  "created_at": "2026-05-28T10:00:00+02:00",
  "producer": "codex",
  "target": ["hubmail", "chatgpt", "roberto"],
  "message_type": "status_report",
  "priority": "normal",
  "summary": "Creato prototipo audio to video con analisi BPM e render base.",
  "current_state": {
    "branch": "main",
    "commit": "<commit-sha>",
    "working_tree": "clean_or_dirty",
    "last_successful_command": "python -m audio2videopal.cli examples/input/test.mp3"
  },
  "implemented": [
    "audio loading",
    "basic BPM detection",
    "timeline JSON export"
  ],
  "open_questions": [
    "Preferire MoviePy o FFmpeg diretto per export finale?"
  ],
  "blocked_by": [],
  "next_actions": [
    "aggiungere test automatici",
    "creare preset visual base"
  ],
  "artifacts": [
    {
      "type": "video",
      "path": "examples/output/demo.mp4",
      "description": "Video generato dal prototipo"
    },
    {
      "type": "analysis",
      "path": "examples/output/demo.timeline.json",
      "description": "Timeline beat/onset/energia"
    }
  ],
  "fallback_used": null,
  "requires_human_review": true
}
```

### 6.3 Schema Markdown minimo

```md
# Audio2VideoPal status - 2026-05-28 10:00

## Sintesi
Creato prototipo audio to video con analisi BPM e render base.

## Cosa e' stato fatto
- Audio loading
- BPM detection base
- Timeline JSON export

## Problemi aperti
- Scegliere motore export finale: MoviePy o FFmpeg diretto

## Prossimi passi
- Aggiungere test
- Creare preset visual

## Artefatti
- examples/output/demo.mp4
- examples/output/demo.timeline.json
```

---

## 7. Metodi di comunicazione HubMail e fallback

Codex deve progettare HubMail come trasporto pluggable. Non deve dipendere da un solo canale.

### 7.1 Metodo A - File system locale

Uso:

```text
feeds/outgoing/
feeds/incoming/
feeds/archive/
feeds/failed/
```

Pro:

- semplice;
- versionabile;
- leggibile;
- testabile senza rete.

Contro:

- richiede sincronizzazione esterna se i progetti sono su macchine diverse.

### 7.2 Metodo B - Git repository come mailbox

Ogni progetto scrive feed in una directory versionata, poi fa commit/push.

Esempio:

```text
hubmail/
  inbox/
    Audio2VideoPal/
    JamPal/
    PraticheCasa/
  outbox/
  archive/
  registry/
    projects.json
    skills.json
```

Pro:

- audit trail naturale;
- facile integrazione con Codex;
- storico consultabile;
- diff leggibili.

Contro:

- serve gestione conflitti;
- non adatto a messaggi troppo frequenti.

### 7.3 Metodo C - Casella email dedicata

Audio2VideoPal deve poter produrre un messaggio email strutturato verso HubMail.

Oggetto consigliato:

```text
[HubMail][Audio2VideoPal][status_report][normal] Sintesi breve
```

Corpo email:

- sezione Markdown leggibile;
- allegato JSON feed;
- link al commit o agli artefatti.

Pro:

- indipendente dal repo;
- adatto a notifiche;
- compatibile con automazioni Gmail/IMAP.

Contro:

- parsing meno stabile;
- attenzione a spam, allegati, quote e thread.

### 7.4 Metodo D - API HTTP locale o remota

Endpoint futuro:

```text
POST /hubmail/messages
GET /hubmail/messages?project=Audio2VideoPal
POST /hubmail/skills
GET /hubmail/registry
```

Pro:

- piu' evoluto;
- adatto a dashboard;
- consente validazione schema.

Contro:

- richiede servizio attivo;
- serve autenticazione.

### 7.5 Metodo E - Cartella cloud sincronizzata

Possibili percorsi:

```text
Google Drive/HubMail/inbox/Audio2VideoPal/
OneDrive/HubMail/inbox/Audio2VideoPal/
Dropbox/HubMail/inbox/Audio2VideoPal/
```

Pro:

- facile da usare su Windows;
- visibile manualmente;
- non richiede server.

Contro:

- rischio conflitti di sync;
- latenza non deterministica.

---

## 8. Ordine di fallback richiesto

Codex deve implementare o almeno documentare questo ordine:

1. Scrivi sempre feed locale in `feeds/outgoing/`.
2. Se configurato un repository HubMail, copia anche in `../HubMail/inbox/Audio2VideoPal/` oppure nel percorso indicato da variabile ambiente.
3. Se disponibile Git, crea commit dedicato dei feed oppure suggerisci il comando.
4. Se configurata email/SMTP/IMAP/Gmail API, invia email strutturata.
5. Se disponibile API HTTP HubMail, invia POST del JSON.
6. Se fallisce tutto, scrivi in `feeds/failed/` con errore esplicito.
7. Non cancellare mai un feed non consegnato.
8. Archivia i feed consegnati in `feeds/archive/` solo dopo conferma.

Variabili ambiente consigliate:

```text
HUBMAIL_MODE=filesystem|git|email|http|cloud|disabled
HUBMAIL_ROOT=../HubMail
HUBMAIL_PROJECT_ID=Audio2VideoPal
HUBMAIL_EMAIL_TO=hubmail@example.com
HUBMAIL_EMAIL_FROM=audio2videopal@example.com
HUBMAIL_HTTP_ENDPOINT=http://localhost:8787/hubmail/messages
HUBMAIL_API_KEY=<secret>
```

---

## 9. Feed incoming da HubMail verso Audio2VideoPal

Audio2VideoPal deve leggere istruzioni da:

```text
feeds/incoming/
```

Schema messaggio incoming:

```json
{
  "schema_version": "1.0",
  "message_id": "hubmail-20260528-0001",
  "source": "chatgpt",
  "target_project": "Audio2VideoPal",
  "message_type": "task_request",
  "priority": "high",
  "created_at": "2026-05-28T10:05:00+02:00",
  "task": {
    "title": "Implementare prototipo minimo",
    "description": "Creare CLI che prende audio e genera video base sincronizzato.",
    "acceptance_criteria": [
      "comando CLI documentato",
      "timeline JSON generata",
      "video MP4 generato",
      "test minimo presente"
    ]
  },
  "reply_expected": true,
  "reply_path": "feeds/outgoing/"
}
```

Codex deve prevedere uno script futuro:

```bash
python -m audio2videopal.feed poll
python -m audio2videopal.feed send-status
```

---

## 10. Registry progetti e skill

Ogni progetto collegato a HubMail deve dichiarare le proprie skill.

File locale consigliato:

```text
hubmail.project.json
```

Contenuto:

```json
{
  "project": "Audio2VideoPal",
  "repo": "robvamos/Audio2VideoPal",
  "description": "Trasforma audio in video audio-reactive esportabile.",
  "skills": [
    "audio ingestion",
    "BPM detection",
    "onset detection",
    "beat grid",
    "video rendering",
    "FFmpeg export",
    "visual presets",
    "HubMail feed writer"
  ],
  "interfaces": {
    "cli": "python -m audio2videopal.cli",
    "feed_outgoing": "feeds/outgoing/",
    "feed_incoming": "feeds/incoming/"
  },
  "dependencies": [
    "ffmpeg",
    "python",
    "numpy",
    "librosa or aubio or essentia",
    "opencv or moviepy"
  ]
}
```

---

## 11. Criteri di accettazione per Codex

Codex deve lavorare per piccoli step e produrre sempre un feed dopo ogni step rilevante.

### Step 1 - Fondazione

- Creare struttura directory.
- Aggiornare README.
- Aggiungere `CODEX_TASKS.md`.
- Aggiungere `HUBMAIL_FEED_SPEC.md`.
- Aggiungere `.gitignore`.
- Aggiungere dipendenze minime.

### Step 2 - Prototipo CLI

- Comando CLI minimo:

```bash
python -m audio2videopal.cli analyze examples/input/demo.mp3
python -m audio2videopal.cli render examples/input/demo.mp3 --out examples/output/demo.mp4
```

### Step 3 - Timeline

- Generare `*.timeline.json`.
- Salvare BPM, beat, onset, energia.

### Step 4 - Video base

- Generare video con waveform/barre/pulse.
- Export MP4.
- Log chiaro.

### Step 5 - Feed HubMail

- Generare feed JSON e MD.
- Scrivere sempre su `feeds/outgoing/`.
- Gestire fallback su `feeds/failed/`.

### Step 6 - Documentazione

- Documentare installazione.
- Documentare esempi.
- Documentare fallback HubMail.

---

## 12. Regole operative per Codex

1. Non eliminare file senza motivo.
2. Non fare refactor distruttivi nella prima fase.
3. Preferire prototipi piccoli ma funzionanti.
4. Ogni comando deve essere documentato.
5. Ogni errore deve essere leggibile.
6. Ogni output importante deve avere percorso noto.
7. Ogni decisione architetturale deve essere annotata in `docs/architecture.md` o `CHANGELOG.md`.
8. Ogni step importante deve generare feed JSON + Markdown.
9. Se mancano dettagli, scegliere default ragionevoli e dichiararli nel feed.
10. Se un canale HubMail non funziona, usare il fallback successivo senza bloccare il lavoro.

---

## 13. Messaggio sintetico da dare a Codex

Implementa Audio2VideoPal come prototipo evolutivo audio-to-video. Parti dalla struttura del repository, crea una CLI Python minima, analizza un file audio, genera timeline JSON, crea un video base sincronizzato e predisponi un sistema HubMail con feed JSON/Markdown in `feeds/outgoing/`. Documenta tutti i fallback: filesystem locale, repository Git HubMail, email, HTTP API e cartella cloud. Dopo ogni step importante, scrivi un feed per ChatGPT/Roberto con stato, artefatti, problemi, prossime azioni e percorso dei file generati.
