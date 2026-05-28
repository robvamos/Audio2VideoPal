# Audio2VideoPal - Listening Pipeline Brief

## 1. Scopo di questo documento

Questo documento concentra il progetto sulla prima parte fondamentale: l'ascolto.

Audio2VideoPal deve essere modulare e deve costruire progressivamente una pipeline che parte dal suono in ingresso e arriva a decidere cosa suonare, visualizzare o generare in uscita.

La priorita' attuale non e' ancora suonare bene, ma ascoltare bene:

- capire il BPM;
- stabilizzare il tempo;
- capire dove cade l'1 della battuta;
- contare rapidamente 1, 2, 3, 4;
- capire se siamo dentro una frase o alla sua conclusione;
- capire se siamo alla prima battuta di un giro, nel mezzo o alla chiusura;
- predisporre in futuro la predizione della struttura;
- separare, per quanto possibile, quello che il sistema ascolta da quello che il sistema stesso suona.

---

## 2. Natura modulare del progetto

Il progetto deve essere pensato come pipeline componibile:

```text
Input audio
  -> preprocessing
  -> feature extraction parallela
  -> moduli di analisi BPM/onset/downbeat
  -> fusione pesata delle evidenze
  -> beat grid adattiva
  -> bar tracker 1-2-3-4
  -> phrase/giro tracker
  -> predizione futura
  -> generazione output sonoro/visual
  -> sottrazione/gestione feedback output->input
```

Ogni modulo deve poter essere:

- sostituito;
- acceso/spento;
- pesato;
- confrontato con altri moduli;
- valutato con metriche;
- loggato separatamente.

---

## 3. Input audio

### 3.1 Input principale: microfono

Nel caso d'uso reale il sistema ascolta dal microfono.

Problemi:

- rumore ambientale;
- riverbero;
- strumenti sovrapposti;
- volume variabile;
- latenza;
- il sistema potrebbe sentire anche quello che sta suonando lui stesso.

### 3.2 Input di test: player interno

Per prototipare, il sistema deve poter usare un player interno come sorgente.

Vantaggi:

- segnale pulito;
- timing noto;
- file ripetibile;
- facile confrontare versioni diverse dell'algoritmo;
- possibile conoscere esattamente cosa viene suonato e sottrarlo dal flusso di ascolto.

Modalita' consigliate:

```text
source=microphone
source=internal_player
source=file_offline
source=loopback
```

---

## 4. Primo stadio: rilevamento BPM stabile

Il primo obiettivo pratico e' stabilizzare e affinare il rilevamento del BPM.

Non bisogna affidarsi a un solo algoritmo. Il sistema deve sperimentare piu' moduli paralleli, ognuno con un peso e una confidenza.

Esempio:

```json
{
  "bpm_candidates": [
    {"module": "aubio_tempo", "bpm": 111.8, "confidence": 0.76, "weight": 0.30},
    {"module": "librosa_beat", "bpm": 112.3, "confidence": 0.69, "weight": 0.25},
    {"module": "onset_autocorrelation", "bpm": 111.9, "confidence": 0.81, "weight": 0.25},
    {"module": "low_band_pulse", "bpm": 112.0, "confidence": 0.73, "weight": 0.20}
  ],
  "fused_bpm": 112.0,
  "fused_confidence": 0.78
}
```

Il sistema deve distinguere:

- BPM istantaneo;
- BPM medio recente;
- BPM stabile di contesto;
- BPM candidato alternativo;
- half-time/double-time.

---

## 5. Preprocessing del segnale

Il suono in ingresso non dovrebbe essere analizzato grezzo. Deve passare da preprocessing configurabile.

### 5.1 Normalizzazione

Possibili operazioni:

- normalizzazione livello;
- limiter leggero;
- rimozione DC offset;
- riduzione rumore semplice;
- compressione leggera per rendere piu' leggibili gli attacchi.

### 5.2 Filtri per range di frequenze

Il segnale puo' essere scomposto in bande. Ogni banda puo' contribuire in modo diverso.

Ipotesi iniziali da testare:

```text
sub/low band       20-120 Hz     cassa, pulse grave
low-mid band      120-500 Hz     corpo ritmico, basso
mid band          500-2000 Hz    chitarra, piano, voce, attacchi
high-mid band    2000-6000 Hz    rullante, plettro, consonanti
high band        6000-12000 Hz   hi-hat, piatti, transitori
```

Questi range non sono definitivi. Codex deve renderli configurabili.

### 5.3 Analisi parallela per banda

Ogni banda puo' produrre features diverse:

```json
{
  "band": "low",
  "onset_rate": 1.86,
  "pulse_strength": 0.72,
  "bpm_candidate": 112.0,
  "downbeat_hint": 0.45
}
```

La banda bassa potrebbe aiutare sul tempo, la banda alta sugli attacchi, la banda media sui cambi armonici o frasi.

---

## 6. Feature extraction parallela

Il sistema deve calcolare piu' feature in parallelo.

Feature candidate:

- onset strength;
- transient density;
- RMS energy;
- spectral flux;
- spectral centroid;
- low-frequency pulse;
- high-frequency attack rate;
- chroma / tonal centroid;
- key change hints;
- harmonic change detection;
- silence / pause detection;
- novelty curve;
- self-similarity matrix per frasi e ripetizioni.

Non tutte devono essere implementate subito. Ma l'architettura deve prevederle.

---

## 7. Fusione pesata delle analisi

Ogni modulo produce una opinione, non una verita'.

Il sistema deve fondere evidenze diverse:

```text
BPM finale = combinazione pesata di candidati + confidenza + stabilita' storica
Downbeat finale = score multi-indizio
Bar position = beat grid + downbeat + memoria recente
Phrase position = ripetizioni + cambi energia + cambi armonici + contatori battute
```

### 7.1 Struttura consigliata

```json
{
  "analysis_frame": {
    "time": 42.500,
    "window_sec": 8.0,
    "features": {
      "rms_energy": 0.63,
      "onset_strength": 0.81,
      "low_band_pulse": 0.77,
      "harmonic_change": 0.34,
      "silence_score": 0.02
    },
    "candidates": {
      "bpm": [112.0, 56.0, 224.0],
      "downbeat_times": [40.00, 42.14],
      "phrase_lengths_bars": [4, 8]
    },
    "decision": {
      "bpm": 112.0,
      "beat_in_bar": 3,
      "bar_in_phrase": 2,
      "confidence": 0.79
    }
  }
}
```

---

## 8. Finestre di memoria differenti

Il sistema deve ascoltare con finestre di memoria diverse e pesi diversi.

### 8.1 Finestra breve

Durata indicativa: 1-3 secondi.

Serve per:

- reattivita';
- attacchi recenti;
- stop improvvisi;
- ripartenze;
- cambi bruschi.

### 8.2 Finestra media

Durata indicativa: 4-12 secondi.

Serve per:

- BPM stabile;
- conferma beat grid;
- rilevamento della battuta;
- stima 1-2-3-4.

### 8.3 Finestra lunga

Durata indicativa: 16-60 secondi o piu'.

Serve per:

- struttura;
- frasi;
- ripetizioni;
- sezioni;
- pattern ricorrenti;
- predittivita'.

### 8.4 Finestra storica adattiva

Serve per ricordare:

- BPM dominante recente;
- pattern ritmici gia' ascoltati;
- durata tipica delle frasi;
- probabilita' che un ritornello si ripeta;
- comportamento del brano o del musicista.

---

## 9. Contare rapidamente 1, 2, 3, 4

Il sistema deve produrre una stima continua:

```text
beat corrente: 1 / 2 / 3 / 4
battuta corrente: N
confidenza fase: 0.0-1.0
```

Questo richiede:

1. BPM abbastanza stabile;
2. fase della griglia;
3. ipotesi di metrica, inizialmente 4/4;
4. stima del downbeat;
5. correzione quando gli accenti reali smentiscono la griglia.

Esempio output:

```json
{
  "time": 28.750,
  "bpm": 112.0,
  "meter": "4/4",
  "bar": 12,
  "beat_in_bar": 4,
  "next_beat_prediction": 29.286,
  "next_downbeat_prediction": 29.821,
  "phase_confidence": 0.83,
  "downbeat_confidence": 0.71
}
```

---

## 10. Capire se siamo all'inizio o alla fine di un giro

Il progetto deve distinguere:

```text
prima battuta del giro
seconda battuta
terza battuta
quarta battuta / chiusura
```

Poi generalizzare a frasi da 8 o 16 battute.

Indizi:

- pattern che si ripete;
- accento forte sull'inizio frase;
- fill o aumento densita' verso fine frase;
- pausa prima del ritorno sull'1;
- cambio armonico;
- cambio di energia;
- cambio timbrico;
- ripetizione vocale/melodica;
- struttura tipica: ritornello di 4/8 battute ripetuto.

Output desiderato:

```json
{
  "phrase": {
    "length_bars_guess": 4,
    "bar_in_phrase": 4,
    "is_phrase_start": false,
    "is_phrase_end": true,
    "confidence": 0.68,
    "next_event_guess": "possible_section_change_or_repeat"
  }
}
```

---

## 11. Ruolo dei cambi di tonalita' e armonia

Il cambio di tonalita' o di accordo puo' aiutare a capire:

- inizio frase;
- fine giro;
- cambio sezione;
- passaggio a ritornello;
- bridge/stacco.

Questa analisi non deve bloccare il primo prototipo, ma deve essere prevista come modulo parallelo.

Esempio:

```json
{
  "harmonic_analysis": {
    "key_guess": "A minor",
    "key_confidence": 0.54,
    "chord_change_strength": 0.72,
    "harmonic_novelty": 0.67,
    "phrase_boundary_hint": 0.58
  }
}
```

Il peso dell'armonia deve essere configurabile. In generi molto percussivi potrebbe contare poco; in generi rock/pop puo' essere utile.

---

## 12. Stato della sincronizzazione

Il sistema deve sapere quanto si fida di se stesso.

Stati consigliati:

```text
SEARCHING     non ha ancora agganciato il tempo
TENTATIVE     ha un BPM candidato ma poca confidenza
LOCKED        BPM e fase affidabili
COASTING      il suono si e' fermato ma il clock interno continua
DRIFTING      la griglia sta divergendo dall'audio
RESYNCING     cerca nuovo tempo/fase/downbeat
LOST          non ha piu' una previsione affidabile
```

Esempio:

```json
{
  "sync_state": "LOCKED",
  "tempo_confidence": 0.86,
  "phase_confidence": 0.79,
  "downbeat_confidence": 0.72,
  "phrase_confidence": 0.55,
  "lost_sync_risk": 0.11
}
```

---

## 13. Sottrazione di quello che il sistema suona

Quando il sistema iniziera' a suonare sopra l'audio, il microfono potrebbe riascoltare il suo output.

Questo e' semplice col player interno, piu' difficile col microfono.

### 13.1 Caso player interno

Se il sistema conosce esattamente il brano riprodotto e cosa sta generando, puo':

- separare sorgente e output;
- non reinserire il proprio output nell'analisi;
- usare direttamente il clock del player per test;
- confrontare analisi stimata con tempo reale noto.

### 13.2 Caso microfono

Problemi:

- bleed dagli altoparlanti;
- latenza ambiente;
- riverbero;
- sovrapposizione tra musicista umano e output del sistema;
- rischio che il sistema insegua se stesso.

Strategie future:

- cuffie invece di altoparlanti;
- echo cancellation;
- adaptive filtering;
- sottrazione del segnale generato noto;
- input separati: microfono umano e output interno;
- gate temporale sugli eventi generati dal sistema;
- non usare gli onset prodotti dal sistema come evidenza primaria;
- marcare nel bus eventi tutto cio' che il sistema ha suonato.

Esempio evento generato:

```json
{
  "time": 51.000,
  "source": "system_output",
  "event_type": "drummer_kick",
  "should_be_ignored_by_listener": true,
  "expected_bleed_window_ms": 120
}
```

---

## 14. Configurazione sperimentale

Codex deve predisporre configurazioni facili da modificare.

Esempio:

```yaml
input:
  source: internal_player
  sample_rate: 44100
  frame_size: 1024
  hop_size: 512

preprocessing:
  normalize: true
  dc_offset_removal: true
  bands:
    low: [20, 120]
    low_mid: [120, 500]
    mid: [500, 2000]
    high_mid: [2000, 6000]
    high: [6000, 12000]

bpm_modules:
  aubio_tempo:
    enabled: true
    weight: 0.30
  librosa_beat:
    enabled: true
    weight: 0.25
  onset_autocorrelation:
    enabled: true
    weight: 0.25
  low_band_pulse:
    enabled: true
    weight: 0.20

memory_windows:
  short_sec: 2.0
  medium_sec: 8.0
  long_sec: 32.0

tracking:
  default_meter: "4/4"
  adaptation_rate: 0.15
  max_phase_shift_ms: 80
  lost_sync_threshold: 0.35
```

---

## 15. Metriche per confrontare moduli

Codex deve produrre log confrontabili.

Metriche utili:

- BPM stimato da ogni modulo;
- varianza del BPM nel tempo;
- tempo necessario per agganciarsi;
- numero di correzioni di fase;
- errore medio rispetto a beat annotati o reference track;
- confidenza media;
- frequenza di falsi downbeat;
- stabilita' su stop/ripartenze;
- capacita' di distinguere half-time/double-time.

Esempio report:

```json
{
  "test_file": "examples/input/song.mp3",
  "modules": {
    "aubio_tempo": {"mean_bpm": 111.8, "std": 1.9, "lock_time_sec": 5.2},
    "librosa_beat": {"mean_bpm": 112.4, "std": 2.3, "lock_time_sec": 8.1},
    "fused_tracker": {"mean_bpm": 112.0, "std": 0.8, "lock_time_sec": 4.7}
  }
}
```

---

## 16. Roadmap immediata per Codex

### Step 1 - Audio source abstraction

Creare un'interfaccia comune:

```text
AudioSource
  MicrophoneSource
  InternalPlayerSource
  FileSource
```

### Step 2 - Preprocessing configurabile

- normalizzazione;
- segmentazione frame;
- filtri per bande;
- output diagnostico.

### Step 3 - Moduli BPM paralleli

- almeno due metodi indipendenti;
- risultato per modulo;
- fusione pesata;
- log comparativo.

### Step 4 - Beat grid e fase

- costruzione griglia;
- correzione lenta;
- stato SEARCHING/TENTATIVE/LOCKED.

### Step 5 - Downbeat e 1-2-3-4

- ipotesi 4/4 iniziale;
- downbeat score;
- beat_in_bar continuo;
- confidenza.

### Step 6 - Phrase tracker minimo

- conta battute in gruppi da 4;
- identifica possibili inizio/fine giro;
- produce previsione elementare.

### Step 7 - Feed HubMail tecnico-musicale

Ogni run deve produrre:

- configurazione usata;
- BPM per modulo;
- BPM fuso;
- stato sync;
- errori;
- prossimi test consigliati.

---

## 17. Output minimo desiderato dal prototipo listening

Comando esempio:

```bash
python -m audio2videopal.listen --source file --input examples/input/demo.mp3 --config configs/listening.yaml
```

Output:

```text
BPM fused: 112.0 confidence 0.78
State: LOCKED
Meter: 4/4
Current beat: 1 2 3 4 tracking available
Estimated phrase length: 4 bars
```

File generati:

```text
examples/output/demo.listening.json
examples/output/demo.beatgrid.json
examples/output/demo.module-comparison.json
feeds/outgoing/YYYYMMDD-HHMMSS-audio2videopal-listening-status.json
```

---

## 18. Messaggio operativo sintetico per Codex

Concentrati ora sulla pipeline di ascolto. Implementa input modulare da microfono, player interno e file. Preprocessa il segnale con normalizzazione e bande configurabili. Esegui piu' moduli BPM/onset in parallelo, pesa i risultati e fondili in un BPM stabile con confidenza. Costruisci una beat grid adattiva, poi conta 1-2-3-4 in 4/4 e inizia a stimare inizio/fine giro usando finestre di memoria breve, media e lunga. Prevedi da subito il problema del feedback: quello che il sistema suona non deve essere riascoltato come se venisse dal musicista umano.
