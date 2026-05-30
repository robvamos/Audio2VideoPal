# ChatGPT Feed - Evolutionary Rhythm Testing, Harmony Hints and Graph Learning

Date: `2026-05-30`
Project: `Audio2VideoPal`
Target: `Codex`
Priority: `high`

## 1. Sintesi

Il lavoro fatto finora va nella direzione corretta: benchmark deterministici, sweep di parametri, preset raccomandato, support graph e UI di consultazione report.

Ora pero' bisogna evolvere il sistema da semplice rilevamento di picchi e BPM verso un modello piu' musicale:

```text
BPM -> fase -> beat 1/2/3/4 -> battute -> giro di accordi -> frase -> sezione
```

Il punto critico non e' solo trovare il tempo medio. Il sistema deve capire dove cade l'`1`, se quel `1` e' davvero inizio battuta, se e' anche inizio giro, e se il giro si ripete come loop di 2/4/8 battute.

La tonalita', i cambi accordo e la memoria armonica potrebbero essere molto utili per questo, ma non devono essere usati come detector primario del BPM. Devono diventare un ramo parallelo di evidenza per downbeat, inizio giro e phrase boundary.

---

## 2. Raccomandazione principale

Separare chiaramente questi quattro problemi:

```text
Tempo tracking      -> quanto dura il beat
Phase tracking      -> dove cade la griglia
Downbeat tracking   -> quale beat e' l'1
Form tracking       -> quale battuta e' inizio/fine giro o sezione
```

Non far decidere tutto a un unico `combined_signal`.

Il segnale `combined_signal` e' utile per trovare picchi, ma il musicista software deve mantenere ipotesi musicali concorrenti.

---

## 3. Test: cosa serve aggiungere

### 3.1 Continuare con benchmark sintetici

I benchmark sintetici sono fondamentali. Mantenerli.

Servono per:

- controllare regressioni;
- sapere esattamente BPM e downbeat;
- testare stop/ripartenze;
- testare cambi tempo;
- verificare phase lock.

### 3.2 Aggiungere brani normali / realistici

Assicurarsi che esista anche una libreria di test con audio piu' simile a musica reale:

- batteria;
- basso;
- chitarre/piano/synth;
- voce;
- hi-hat e transienti fitti;
- cambi accordo;
- strofa/ritornello;
- fill;
- sezioni con densita' diversa;
- intro con pochi strumenti;
- chorus pieno;
- bridge o stacco.

La libreria pubblica con BPM dichiarato e' utile, ma non basta se contiene solo loop troppo puliti. Servono anche casi piu' musicali e confusi, con voce e armonia.

### 3.3 Classificare i test per difficolta'

Organizzare i test cosi':

```text
level_01_metronome_clean
level_02_kick_snare_clean
level_03_drum_loop_hihat_dense
level_04_bass_and_drums
level_05_full_band_no_voice
level_06_full_band_with_voice
level_07_full_song_sections
level_08_tempo_change
level_09_pause_restart
level_10_ambiguous_half_double_time
level_11_chord_loop_4_bars
level_12_key_or_chord_change_on_section_boundary
```

Ogni test deve dichiarare:

- BPM;
- meter;
- downbeat times;
- beat markers;
- bar markers;
- chord changes, se noti;
- section boundaries, se noti;
- expected phrase length.

---

## 4. Criteri di validita' dei test

L'attuale score e' buono, ma per l'obiettivo del progetto bisogna riequilibrarlo.

Attuale orientamento:

```text
BPM + relock dominano molto.
Downbeat + grid sono ancora sottopesati.
```

Proposta di scoring per la fase attuale:

```text
bpm_score            0.22
phase_score          0.18
downbeat_score       0.24
grid_score           0.18
relock_score         0.10
pause_score          0.08
```

Oppure mantenere due score separati:

```text
Tempo Score       = BPM + relock + pause
Musical Grid Score = phase + downbeat + 1/2/3/4 + bar consistency
```

Non eleggere un preset solo per overall score se ha buon BPM ma downbeat debole.

### 4.1 Condizione minima per considerare valido un preset

Un preset dovrebbe essere candidato solo se:

```text
mean_bpm_abs_error <= soglia
mean_grid_score >= soglia
mean_downbeat_score >= soglia
false_downbeat_rate <= soglia
```

Il downbeat non deve essere solo energia sull'1. Deve misurare se il sistema ha scelto l'ipotesi di fase corretta.

---

## 5. Downbeat: passare da picco forte a ipotesi di fase

Il codice attuale misura il downbeat soprattutto confrontando forza sull'1 noto contro forza sul beat successivo. Questo e' troppo debole.

Implementare un modulo:

```text
DownbeatHypothesisTracker
```

Questo modulo deve mantenere quattro ipotesi concorrenti:

```text
H0: questo beat e' 1
H1: questo beat e' 2
H2: questo beat e' 3
H3: questo beat e' 4
```

Ogni ipotesi riceve punteggi da piu' evidenze:

- accento energia;
- low-band kick;
- periodicita' ogni 4 beat;
- ripetizione pattern su piu' battute;
- fill che risolve;
- pausa prima del beat;
- crash/attacco forte;
- cambio accordo;
- ritorno del giro armonico;
- inizio voce/frase;
- prior di genere/grafo.

Output atteso:

```json
{
  "downbeat_hypotheses": [
    {"phase": 0, "meaning": "beat_1", "score": 0.82, "evidence": ["low_kick", "pattern_repeat", "chord_loop_return"]},
    {"phase": 1, "meaning": "beat_2", "score": 0.31, "evidence": ["snare_accent"]},
    {"phase": 2, "meaning": "beat_3", "score": 0.44, "evidence": ["kick_secondary"]},
    {"phase": 3, "meaning": "beat_4", "score": 0.22, "evidence": ["pickup"]}
  ],
  "selected_phase": 0,
  "downbeat_confidence": 0.82
}
```

---

## 6. Tonalita', accordi e loop armonici

### 6.1 Non usare la tonalita' per il BPM

I cambi armonici non devono guidare il BPM primario. Sono troppo lenti e possono essere assenti.

Usarli invece per:

- inizio battuta forte;
- inizio giro;
- fine giro;
- ritorno al primo accordo;
- cambio sezione;
- riconoscimento di loop da 2/4/8 battute.

### 6.2 Aggiungere un vero ramo armonico

L'attuale `tonality_guard` non sembra ancora una vera analisi tonale. Rinominare eventualmente l'attuale guardia in:

```text
spectral_flatness_guard
```

Aggiungere moduli separati:

```text
ChromaExtractor
ChordChangeDetector
HarmonicNoveltyDetector
KeyMemoryTracker
ChordLoopTracker
```

### 6.3 Chord loop come indizio di giro

Molti brani pop/rock usano loop armonici di 2 o 4 accordi.

Esempio:

```text
| Am | F | C | G |
  1   2   3   4 battute
```

Se il sistema osserva che un profilo armonico ritorna ogni 4 battute, questo puo' aiutare a capire:

- che il giro e' di 4 battute;
- quale battuta e' la prima del giro;
- quando arriva la fine del giro;
- quando potrebbe iniziare il ritornello.

Output desiderato:

```json
{
  "harmonic_loop": {
    "candidate_length_bars": 4,
    "confidence": 0.67,
    "chord_change_times": [0.42, 2.56, 4.71, 6.85],
    "loop_return_time": 8.99,
    "supports_downbeat_phase": 0,
    "supports_phrase_start": true
  }
}
```

### 6.4 Peso iniziale consigliato del ramo armonico

Non dargli troppo peso all'inizio.

Proposta:

```text
BPM tracking:             0.00 armonia
Phase tracking:           0.05 armonia
Downbeat tracking:        0.10 armonia
Phrase/giro tracking:     0.20-0.30 armonia
Section tracking futuro:  0.30-0.40 armonia
```

Quindi nel breve termine: l'armonia deve aiutare soprattutto il concetto di giro, non il tempo.

---

## 7. Test specifici per armonia e tonalita'

Aggiungere benchmark sintetici e semi-realistici con accordi noti.

### 7.1 Test chord-loop sintetico

Generare file con:

```text
4/4, 100 BPM
4 battute
accordi: Am F C G
kick sull'1
snare su 2/4
hihat ottavi
```

Ground truth:

```json
{
  "bpm": 100,
  "meter": "4/4",
  "phrase_length_bars": 4,
  "chord_loop": ["Am", "F", "C", "G"],
  "chord_change_bars": [1, 2, 3, 4],
  "loop_return_bar": 5
}
```

### 7.2 Test cambio tonalita'/sezione

Creare file con:

```text
strofa: Am F C G
ritornello: C G Am F
```

Verificare se il sistema vede che:

- il cambio armonico coincide con boundary di sezione;
- il nuovo giro ha un nuovo bar 1;
- l'1 non viene confuso con un semplice accento.

### 7.3 Test voce sopra armonia

Creare o includere brani con voce per capire se:

- la voce crea falsi transienti;
- il detector HFC in 1200-10000 Hz viene confuso dalle consonanti;
- il ramo armonico/chroma resta utile anche con voce.

---

## 8. Evoluzione autonoma sperimentale

Codex deve poter proporre e testare esperimenti da solo, ma sempre con telemetria e guardrail.

### 8.1 Experiment descriptor

Ogni esperimento deve avere un file:

```text
VisualMusic/experiments/<date>-<name>.json
```

Schema:

```json
{
  "experiment_id": "20260530-harmonic-downbeat-hints",
  "hypothesis": "Chord changes and loop returns improve downbeat and phrase-start detection without hurting BPM tracking.",
  "changes": [
    "add chroma novelty branch",
    "add harmonic loop return score",
    "add low weight harmonic evidence to downbeat hypothesis tracker"
  ],
  "success_metrics": {
    "downbeat_score_delta_min": 0.05,
    "grid_score_delta_min": 0.03,
    "bpm_error_delta_max": 0.20
  },
  "rollback_condition": "If BPM error worsens by more than 0.5 or false downbeat rate increases."
}
```

### 8.2 Experiment classes

Creare classi di esperimenti:

```text
rhythm_only
band_sweep
downbeat_phase
harmonic_hint
form_prior
graph_learning
real_song_validation
```

### 8.3 Auto-pruning

Se un ramo peggiora piu' volte:

```text
mark as harmful_for_current_stage
lower weight
exclude from recommended preset
keep as future candidate only
```

---

## 9. Come alimentare il grafo automaticamente

Il grafo attuale e' buono come memoria dichiarativa, ma deve iniziare a imparare dai run.

Ogni benchmark deve produrre osservazioni tipo:

```json
{
  "bucket": "observations",
  "level": "bar_role",
  "source_run": "20260530-benchmark-sweep-001",
  "observation": "preset blend_hfc_kick_fast_refine_07 improves grid score on dense-hihat songs but may overreact to vocal consonants",
  "evidence": {
    "song_id": "level_06_full_band_with_voice",
    "grid_score": 0.78,
    "false_peak_count": 12
  }
}
```

Poi promuovere solo se confermato:

```text
observations -> confirmed_memory
```

dopo almeno N conferme su brani diversi.

### 9.1 Aggiungere performance per genere/pattern

Il grafo deve collegare:

```text
preset -> works_well_on -> genre/pattern/test_type
preset -> fails_on -> failure_mode
harmonic_branch -> helps -> phrase_boundary
hfc_onset -> fails_on -> vocal_consonants / dense_hihat
low_band -> fails_on -> sparse_kick
```

Esempio edge:

```json
{
  "from": "module.harmonic_loop_tracker",
  "to": "pattern.four_bar_cycle",
  "relation": "supports_detection_of",
  "weight": 0.22,
  "evidence_count": 6,
  "confidence": 0.71
}
```

### 9.2 Non confondere priors e osservazioni

Mantenere separati:

- `priors`: conoscenza musicale generale;
- `observations`: risultati di singoli test;
- `confirmed_memory`: regole consolidate;
- `exceptions`: casi dove il prior fallisce.

Questa separazione e' giusta e va mantenuta.

---

## 10. Serve una rete neurale?

Non ancora come componente principale.

Prima servono:

- dataset di test affidabile;
- ground truth con BPM, beat, downbeat, barre, accordi e sezioni;
- metriche corrette;
- grafo alimentato dai risultati;
- modulo downbeat a ipotesi concorrenti;
- ramo armonico trasparente.

Una rete neurale puo' diventare utile dopo per:

- downbeat estimation;
- source separation;
- chord recognition;
- section classification;
- genre/style prior.

Ma oggi rischia di diventare una scatola nera. Usarla solo come modulo opzionale confrontabile, mai come sostituto della telemetria.

Possibile approccio futuro:

```text
NeuralDownbeatCandidateProvider -> produce candidate scores
RuleBasedFusion -> decide usando anche onset, low-band, harmonic loop e graph priors
```

---

## 11. Azioni concrete consigliate ora

### A. Modificare scoring

Aggiungere uno score separato:

```text
musical_grid_score = phase + downbeat + 1/2/3/4 consistency + bar consistency
```

Non eleggere preset se `musical_grid_score` e' basso anche con BPM buono.

### B. Implementare DownbeatHypothesisTracker

Con quattro ipotesi di fase e memoria su piu' battute.

### C. Aggiungere HarmonicHintBranch

Con peso basso iniziale:

```text
0.10 su downbeat
0.20 su phrase/giro
0.00 su BPM
```

### D. Aggiungere test con brani normali

Includere test con:

- voci;
- cambi accordo;
- loop armonici;
- ritornello/strofa;
- intro e chorus;
- densita' alta di hi-hat.

### E. Alimentare il grafo dai run

Ogni run deve scrivere osservazioni automatiche in:

```text
VisualMusic/runtime/graph-observations/
```

Poi un processo separato puo' proporre promozioni a `confirmed_memory`.

### F. Rinominare `tonality_guard`

Se resta basato su spectral flatness/envelope, chiamarlo:

```text
spectral_guard
```

Creare poi un vero:

```text
harmonic_change_hint
```

---

## 12. Messaggio operativo sintetico

Codex: continua con benchmark e sweep, ma ora sposta il focus da BPM a downbeat e fase musicale. Aggiungi test realistici con voce, cambi accordo, loop armonici e sezioni. Implementa un DownbeatHypothesisTracker con ipotesi concorrenti 1/2/3/4. Aggiungi un ramo armonico vero basato su chroma/chord-change/harmonic novelty, con peso basso: zero sul BPM, leggero sul downbeat, maggiore su phrase/giro. Alimenta automaticamente il listening-support-graph con osservazioni dai run, senza confondere priors, observations, confirmed memory ed exceptions. Non introdurre una rete neurale come soluzione principale finche' le metriche e la ground truth non sono robuste; eventualmente usala piu' avanti solo come candidate provider confrontabile.
