# Audio2VideoPal - Musician Agent Brief

## 1. Visione corretta del progetto

Audio2VideoPal non deve essere inteso soltanto come un generatore audio-to-video. La direzione piu' importante e' farlo evolvere in un agente musicale reattivo: un sistema che ascolta quello che succede, capisce il tempo, segue la battuta, riconosce l'inizio dei giri musicali e reagisce in modo simile a un musicista umano.

L'obiettivo finale e' costruire un musicista software che:

- ascolta audio live o file audio;
- riconosce rapidamente il tempo;
- identifica dove cade l'1 della battuta;
- mantiene una griglia 1-2-3-4 stabile ma adattiva;
- capisce quando una battuta appartiene a una frase;
- capisce quando una frase appartiene a una sezione del brano;
- prevede in anticipo cosa probabilmente sta per accadere;
- si adatta se chi suona rallenta, accelera, si ferma, riparte o cambia tempo;
- puo' in futuro accompagnare con batteria, basso, visual o altri output sincronizzati.

Questa visione deve guidare l'architettura prima ancora della generazione video.

---

## 2. Metafora funzionale

Pensare al sistema come a un musicista che entra in sala prove.

Un musicista umano non si limita a calcolare un BPM medio. Fa molte cose insieme:

1. ascolta gli attacchi;
2. cerca un pulse stabile;
3. ipotizza dove sia l'1;
4. verifica se il pattern si ripete ogni 4 battiti;
5. riconosce frasi da 2, 4, 8 o 16 battute;
6. anticipa la fine del giro;
7. corregge la propria previsione quando il gruppo cambia;
8. se tutti si fermano, mantiene una memoria elastica del tempo;
9. se il gruppo riparte, si riaggancia rapidamente.

Audio2VideoPal deve implementare questa logica progressivamente.

---

## 3. Concetti musicali fondamentali da modellare

### 3.1 Pulse

Il pulse e' la pulsazione percepita. Puo' essere piu' importante del BPM numerico.

Output atteso:

```json
{
  "pulse_hz": 1.866,
  "estimated_bpm": 112.0,
  "confidence": 0.82,
  "stability": 0.76
}
```

### 3.2 Beat

Il beat e' ogni colpo percepito nella griglia.

Ogni beat deve avere:

- timestamp;
- indice progressivo;
- posizione nella battuta;
- confidenza;
- intensita';
- eventuale correzione rispetto alla previsione.

Esempio:

```json
{
  "time": 12.482,
  "beat_index": 24,
  "bar_position": 1,
  "predicted_time": 12.470,
  "timing_error_ms": 12,
  "confidence": 0.91
}
```

### 3.3 Downbeat / l'1 della battuta

Il downbeat e' il punto piu' importante: l'1.

Il sistema deve distinguere:

```text
1 2 3 4 | 1 2 3 4 | 1 2 3 4
^
qui inizia la battuta
```

Riconoscere l'1 e' piu' difficile che riconoscere il BPM. Va stimato usando piu' indizi:

- accenti ritmici;
- cassa/rullante;
- armonia;
- cambi di energia;
- pattern ripetitivi;
- inizio frase;
- ricorrenza ogni 4 battiti;
- evento forte dopo una pausa;
- onset piu' marcati;
- eventuale struttura tipica del genere.

### 3.4 Bar / battuta

Una battuta in 4/4 e' normalmente:

```text
1 2 3 4
```

Ma il sistema non deve assumere rigidamente il 4/4 per sempre. Deve partire dal 4/4 come default, ma predisporre:

- 3/4;
- 6/8;
- half-time;
- double-time;
- cambi di metrica futuri.

### 3.5 Phrase / frase musicale

Le battute si organizzano in frasi.

Esempi tipici:

```text
frase da 4 battute:
bar 1 | bar 2 | bar 3 | bar 4

frase da 8 battute:
bar 1 | bar 2 | bar 3 | bar 4 | bar 5 | bar 6 | bar 7 | bar 8
```

Un ritornello puo' essere spesso di 4 o 8 battute e puo' essere ripetuto piu' volte.

Il sistema deve quindi costruire una memoria di pattern e frasi.

### 3.6 Section / parte del brano

Le frasi compongono sezioni:

- intro;
- strofa;
- pre-ritornello;
- ritornello;
- bridge/stacco;
- assolo;
- special;
- finale.

Non serve riconoscerle perfettamente all'inizio. Serve pero' modellare il concetto.

---

## 4. Architettura musicale desiderata

```text
Audio input live/file
  -> onset detector
  -> tempo tracker
  -> beat predictor
  -> downbeat estimator
  -> bar position tracker
  -> phrase tracker
  -> section predictor
  -> adaptive correction engine
  -> output scheduler
  -> video/drum/visual/midi/export layer
```

### Moduli consigliati

```text
src/audio2videopal/
  listening/
    input_stream.py
    onset_detector.py
    feature_extractor.py
  timing/
    tempo_tracker.py
    beat_grid.py
    downbeat_detector.py
    bar_tracker.py
    adaptive_clock.py
  structure/
    phrase_tracker.py
    section_predictor.py
    repetition_detector.py
  reaction/
    output_scheduler.py
    drummer_engine.py
    visual_reactor.py
  feed/
    hubmail_feed_writer.py
    status_reporter.py
```

---

## 5. Beat grid adattiva

Il sistema deve mantenere una griglia prevista e confrontarla con l'audio reale.

Ogni nuovo onset importante deve essere valutato:

```text
onset reale vicino al beat previsto -> rinforza la griglia
onset reale leggermente in anticipo -> micro-correzione
onset reale leggermente in ritardo -> micro-correzione
onset reale molto lontano -> possibile fill, stop, cambio tempo o errore
assenza di onset dove previsto -> possibile pausa o break
```

La griglia non deve saltare bruscamente. Deve correggersi con inerzia, come un musicista.

Parametri utili:

```json
{
  "tempo_bpm": 112.0,
  "tempo_confidence": 0.84,
  "phase_confidence": 0.78,
  "downbeat_confidence": 0.70,
  "adaptation_rate": 0.15,
  "max_phase_shift_ms": 80,
  "lost_sync_threshold": 0.35,
  "resync_threshold": 0.70
}
```

---

## 6. Riconoscimento dell'1, 2, 3, 4

Il sistema deve produrre continuamente una stima della posizione nella battuta:

```json
{
  "current_bar": 18,
  "current_beat_in_bar": 3,
  "meter": "4/4",
  "downbeat_time": 48.120,
  "next_downbeat_prediction": 50.263,
  "confidence": 0.81
}
```

### Indizi per il beat 1

Codex deve implementare un modello a punteggio, non una singola regola.

Possibili features:

- picco di energia sul beat;
- cassa piu' forte;
- cambio accordo;
- inizio pattern basso/chitarra;
- inizio frase vocale;
- ripetizione ogni 4 beat;
- pausa prima dell'attacco;
- fill di batteria che risolve sull'1;
- transizione sezione;
- correlazione con pattern storici gia' ascoltati.

Output utile:

```json
{
  "candidate_downbeats": [
    {"time": 32.000, "score": 0.91, "reasons": ["energy_peak", "phrase_start", "4beat_periodicity"]},
    {"time": 33.071, "score": 0.42, "reasons": ["snare_accent"]}
  ],
  "selected_downbeat": 32.000
}
```

---

## 7. Frasi e predizione della struttura

Il sistema deve osservare la musica su piu' livelli temporali:

```text
millisecondi -> onset
secondi -> beat
4 beat -> battuta
4/8/16 battute -> frase
piu' frasi -> sezione
```

### Esempio di modello predittivo

```json
{
  "current_section_guess": "chorus",
  "section_confidence": 0.64,
  "current_phrase_length_bars": 4,
  "bar_in_phrase": 3,
  "predicted_next_event": {
    "type": "phrase_end",
    "in_bars": 1,
    "expected_time": 64.000
  },
  "possible_next_sections": [
    {"label": "chorus_repeat", "probability": 0.55},
    {"label": "verse", "probability": 0.25},
    {"label": "bridge", "probability": 0.20}
  ]
}
```

Questo serve a reagire musicalmente: ad esempio aumentare intensita' alla fine del giro, fare un fill sull'ultima battuta, cambiare visual al ritorno dell'1, o prepararsi al ritornello.

---

## 8. Stop, ripartenze e cambi tempo

Uno dei requisiti piu' importanti e' l'adattamento rapido.

### 8.1 Quando chi suona si ferma

Il sistema non deve collassare subito. Deve entrare in stato `coasting`:

```text
LOCKED -> COASTING -> LOST -> RESYNCING -> LOCKED
```

Stati:

- `LOCKED`: agganciato al tempo;
- `COASTING`: non sente onset forti, ma mantiene il clock interno;
- `LOST`: la previsione non e' piu' affidabile;
- `RESYNCING`: sta cercando un nuovo tempo o una nuova fase;
- `LOCKED`: ha ritrovato una griglia affidabile.

### 8.2 Quando chi suona riparte

Il sistema deve capire se:

- e' ripartito sullo stesso tempo;
- e' ripartito con fase diversa;
- e' ripartito con BPM diverso;
- e' iniziata una nuova sezione;
- il precedente downbeat non e' piu' valido.

### 8.3 Cambio tempo

Se il tempo cambia, non bisogna forzare il BPM vecchio. Serve un cambio controllato:

```json
{
  "event": "tempo_change_detected",
  "old_bpm": 112.0,
  "new_bpm": 124.0,
  "confidence": 0.77,
  "transition": "gradual_or_abrupt",
  "time": 91.42
}
```

---

## 9. Output reattivi futuri

Audio2VideoPal deve poter generare diversi output sincronizzati.

### 9.1 Visual

- pulse sul beat;
- flash sull'1;
- transizioni a fine frase;
- intensita' visual legata all'energia;
- preset diversi per strofa/ritornello/stacco.

### 9.2 Drummer virtuale

Futuro modulo:

- kick/snare/hihat sincronizzati;
- fill alla fine di frase;
- variazioni di dinamica;
- stacchi quando il musicista si ferma;
- ripartenze sull'1;
- stile adattivo.

### 9.3 MIDI / OSC / eventi

Prevedere output evento:

```json
{
  "time": 45.000,
  "event_type": "downbeat",
  "bar": 12,
  "beat": 1,
  "confidence": 0.88,
  "actions": ["visual_flash", "drummer_kick", "section_marker"]
}
```

---

## 10. Feed HubMail specifico per lo stato musicale

Ogni report verso HubMail deve includere anche lo stato musicale, non solo lo stato tecnico.

Esempio:

```json
{
  "message_type": "musician_agent_status",
  "project": "Audio2VideoPal",
  "musical_state": {
    "mode": "LOCKED",
    "estimated_bpm": 112.0,
    "meter": "4/4",
    "current_bar": 24,
    "current_beat_in_bar": 1,
    "downbeat_confidence": 0.82,
    "phrase_length_guess": 4,
    "bar_in_phrase": 1,
    "section_guess": "chorus",
    "section_confidence": 0.61
  },
  "prediction": {
    "next_downbeat_sec": 64.00,
    "next_phrase_boundary_sec": 72.57,
    "probable_next_section": "chorus_repeat"
  },
  "sync_health": {
    "tempo_confidence": 0.86,
    "phase_confidence": 0.79,
    "lost_sync_risk": 0.12
  }
}
```

---

## 11. Librerie candidate

Codex deve valutare queste librerie, senza bloccare il progetto su una sola scelta:

### Python

- `librosa`: analisi offline, onset, beat tracking, feature extraction;
- `aubio`: onset e pitch/tempo in contesto piu' real-time;
- `essentia`: analisi musicale avanzata, feature piu' ricche;
- `madmom`: beat/downbeat tracking, se installabile;
- `numpy/scipy`: elaborazione numerica;
- `opencv-python` o `moviepy`: video/render;
- `ffmpeg`: export affidabile.

### Web / realtime futuro

- Web Audio API;
- AudioWorklet;
- Tone.js per scheduling musicale;
- Canvas/WebGL/Three.js;
- Butterchurn per visual MilkDrop-like;
- WebM MediaRecorder per export browser.

---

## 12. Roadmap tecnica consigliata

### Fase 1 - Offline analyzer

Input file audio, output timeline:

- BPM;
- beat list;
- onset list;
- energia;
- stima battute 1-2-3-4;
- timeline JSON.

### Fase 2 - Downbeat e bar tracker

- riconoscimento candidato dell'1;
- numerazione battute;
- confidenza fase;
- visualizzazione griglia.

### Fase 3 - Phrase tracker

- raggruppamento in frasi da 2/4/8/16 battute;
- riconoscimento ripetizioni;
- marker di frase;
- previsione fine giro.

### Fase 4 - Adaptive realtime prototype

- input microfono;
- stato LOCKED/COASTING/LOST/RESYNCING;
- adattamento tempo/fase;
- output eventi live.

### Fase 5 - Reactive output

- visual live;
- video export;
- drummer virtuale base;
- MIDI/OSC/event bus.

---

## 13. Criteri di successo

Il progetto comincia a funzionare davvero quando riesce a dire, mentre ascolta:

```text
Sto ascoltando circa 112 BPM.
Sono in 4/4.
Questo e' probabilmente il beat 1 della battuta.
Ora siamo sul 2.
Ora sul 3.
Ora sul 4.
Questa sembra la terza battuta di una frase da 4.
Fra una battuta probabilmente il giro chiude.
Il musicista si e' fermato: tengo il clock ma abbasso la confidenza.
Il musicista e' ripartito: mi riaggancio al nuovo 1.
Il tempo sembra cambiato: transizione da 112 a 124 BPM.
```

Questo e' il comportamento da ottenere prima di pensare a effetti visivi complessi.

---

## 14. Messaggio operativo sintetico per Codex

Audio2VideoPal deve diventare un musicista software reattivo. Implementa prima la percezione musicale: onset, BPM, beat grid, downbeat, posizione 1-2-3-4, frasi da 2/4/8/16 battute, predizione di fine giro, gestione stop/ripartenze/cambi tempo. Solo dopo collega questi eventi a video, visual, drummer, MIDI o export. Ogni modulo deve produrre JSON leggibile e feed HubMail con stato musicale, confidenza, previsioni e problemi aperti.
