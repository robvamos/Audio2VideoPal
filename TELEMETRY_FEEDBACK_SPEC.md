# Audio2VideoPal - Telemetry Feedback Specification

## 1. Obiettivo

Questo documento spiega a Codex come deve strutturare il feedback tecnico verso ChatGPT/Roberto per rendere analizzabile ogni esecuzione della pipeline di ascolto.

Il progetto e' prototipale: non bisogna solo sapere se il programma gira, ma capire in dettaglio:

- quale modulo sta facendo cosa;
- quale modulo aiuta davvero;
- quale modulo peggiora la pipeline;
- quanto velocemente converge il BPM;
- quanto bene si allinea la griglia 1-2-3-4;
- se l'1 cade nel punto giusto;
- quanto tempo serve per agganciarsi;
- quanto rapidamente si adatta a stop, ripartenze o cambi tempo;
- quali costrutti architetturali vanno semplificati, esclusi o riprogettati.

La telemetria deve essere prodotta in JSON per analisi macchina e in Markdown per lettura umana.

---

## 2. Obiettivo musicale iniziale

L'obiettivo iniziale non e' ancora riconoscere tutto il brano.

L'obiettivo iniziale e':

```text
costruire una grid affidabile di una battuta in 4/4:

1 2 3 4
^
l'1 deve essere nel punto giusto
```

Solo dopo il sistema deve estendere la griglia a piu' battute, frasi, giri e sezioni.

Priorita':

1. trovare BPM plausibile;
2. stabilizzare pulse;
3. trovare fase della griglia;
4. riconoscere il downbeat, cioe' l'1;
5. contare 1-2-3-4;
6. verificare convergenza e correzioni;
7. estendere a battute successive.

---

## 3. File di telemetria prodotti a ogni esecuzione

Ogni run deve produrre almeno:

```text
runtime/logs/latest.log
examples/output/<run_id>.telemetry.json
examples/output/<run_id>.summary.md
examples/output/<run_id>.module-comparison.json
examples/output/<run_id>.beatgrid.json
feeds/outgoing/<timestamp>-audio2videopal-telemetry.json
feeds/outgoing/<timestamp>-audio2videopal-telemetry.md
```

Se esiste una ground truth nota:

```text
examples/output/<run_id>.alignment-report.json
examples/output/<run_id>.alignment-report.md
```

---

## 4. Ground truth per player interno e file di test

Quando l'ingresso e' un player interno o un file di test noto, Codex deve prevedere metadata di riferimento.

Esempio file:

```text
examples/reference/demo.reference.json
```

Schema:

```json
{
  "audio_file": "examples/input/demo.mp3",
  "known_bpm": 112.0,
  "meter": "4/4",
  "first_downbeat_sec": 0.420,
  "beat_times_sec": [0.420, 0.956, 1.492, 2.028],
  "bar_times_sec": [0.420, 2.564, 4.708, 6.852],
  "sections": [
    {"label": "intro", "start_sec": 0.420, "end_sec": 17.572},
    {"label": "verse", "start_sec": 17.572, "end_sec": 51.860}
  ],
  "notes": "Reference manuale o derivata da DAW/metronomo. Usare per validare convergenza e downbeat."
}
```

Se la ground truth non e' disponibile, Codex deve dichiararlo esplicitamente e produrre solo metriche interne.

---

## 5. Schema telemetry JSON principale

```json
{
  "schema_version": "1.0",
  "project": "Audio2VideoPal",
  "run_id": "20260528-113000-demo",
  "created_at": "2026-05-28T11:30:00+02:00",
  "source": {
    "type": "internal_player",
    "input_path": "examples/input/demo.mp3",
    "has_reference": true,
    "reference_path": "examples/reference/demo.reference.json"
  },
  "goal": {
    "primary": "one_bar_grid_alignment",
    "meter_assumption": "4/4",
    "success_definition": "BPM stable and beat positions 1-2-3-4 aligned with downbeat confidence above threshold"
  },
  "configuration": {
    "config_path": "configs/listening.yaml",
    "enabled_modules": ["aubio_tempo", "onset_autocorrelation", "low_band_pulse"],
    "disabled_modules": ["harmonic_change_detector"],
    "preprocessing": {
      "normalize": true,
      "bands_enabled": ["low", "mid", "high"]
    },
    "memory_windows_sec": {
      "short": 2.0,
      "medium": 8.0,
      "long": 32.0
    }
  },
  "result_summary": {
    "status": "partial_success",
    "fused_bpm": 112.1,
    "bpm_confidence": 0.81,
    "sync_state_final": "LOCKED",
    "downbeat_confidence": 0.74,
    "phase_confidence": 0.79,
    "one_bar_grid_score": 0.76,
    "human_readable_summary": "BPM converged well, but downbeat lock is still uncertain in the first 4 seconds."
  },
  "convergence": {
    "time_to_first_bpm_candidate_sec": 1.4,
    "time_to_stable_bpm_sec": 5.8,
    "time_to_phase_lock_sec": 7.2,
    "time_to_downbeat_lock_sec": 9.6,
    "lock_lost_count": 1,
    "resync_count": 1
  },
  "alignment_against_reference": {
    "bpm_error_abs": 0.1,
    "mean_beat_error_ms": 28.5,
    "median_beat_error_ms": 22.0,
    "max_beat_error_ms": 91.0,
    "downbeat_error_ms": 44.0,
    "bar_1_correct": true,
    "beat_position_accuracy": 0.87
  },
  "module_performance": [],
  "architectural_findings": [],
  "recommended_next_changes": []
}
```

---

## 6. Module performance

Ogni modulo deve produrre una scheda separata.

Esempio:

```json
{
  "module": "low_band_pulse",
  "enabled": true,
  "role": "bpm_candidate",
  "input": "preprocessed.low_band",
  "weight": 0.20,
  "output": {
    "bpm": 112.0,
    "confidence": 0.73,
    "latency_ms": 35
  },
  "quality": {
    "bpm_error_abs": 0.0,
    "stability_score": 0.82,
    "false_peak_count": 3,
    "contribution_to_fused_result": "positive"
  },
  "notes": "Useful for pulse, but weak for downbeat detection."
}
```

Codex deve classificare ogni modulo:

```text
positive       migliora il risultato
neutral        non cambia molto
negative       peggiora o destabilizza
unknown        dati insufficienti
expensive      utile ma troppo costoso/lento
premature      architetturalmente interessante ma troppo presto per usarlo
```

---

## 7. Telemetria sulla griglia 1-2-3-4

Il cuore iniziale del progetto e' la one-bar grid.

Output consigliato:

```json
{
  "one_bar_grid": {
    "meter": "4/4",
    "estimated_bpm": 112.1,
    "beat_duration_sec": 0.535,
    "estimated_downbeat_sec": 0.462,
    "reference_downbeat_sec": 0.420,
    "downbeat_error_ms": 42,
    "beats": [
      {"position": 1, "estimated_sec": 0.462, "reference_sec": 0.420, "error_ms": 42, "confidence": 0.74},
      {"position": 2, "estimated_sec": 0.997, "reference_sec": 0.956, "error_ms": 41, "confidence": 0.78},
      {"position": 3, "estimated_sec": 1.532, "reference_sec": 1.492, "error_ms": 40, "confidence": 0.80},
      {"position": 4, "estimated_sec": 2.067, "reference_sec": 2.028, "error_ms": 39, "confidence": 0.77}
    ],
    "score": 0.76,
    "verdict": "usable_but_needs_better_downbeat"
  }
}
```

Verdetti possibili:

```text
not_detected
bpm_detected_phase_unknown
grid_detected_downbeat_wrong
usable_but_unstable
usable_but_needs_better_downbeat
locked_good
```

---

## 8. Convergenza

Codex deve misurare la rapidita' con cui la pipeline arriva a una decisione affidabile.

Metriche minime:

- tempo al primo BPM candidato;
- tempo al BPM stabile;
- tempo alla fase stabile;
- tempo al downbeat stabile;
- tempo alla griglia 1-2-3-4 usabile;
- numero di ripensamenti del BPM;
- numero di salti di fase;
- numero di downbeat candidati cambiati.

Esempio:

```json
{
  "convergence_timeline": [
    {"time_sec": 1.2, "state": "TENTATIVE", "bpm": 113.5, "reason": "first_onset_cluster"},
    {"time_sec": 3.8, "state": "TENTATIVE", "bpm": 111.9, "reason": "autocorrelation_support"},
    {"time_sec": 5.8, "state": "LOCKED_BPM", "bpm": 112.1, "reason": "multi_module_agreement"},
    {"time_sec": 9.6, "state": "LOCKED_DOWNBEAT", "reason": "stable_4beat_periodicity"}
  ]
}
```

---

## 9. Adattamento a cambi e ripartenze

Quando il file di test contiene stop, ripartenze o cambi BPM, Codex deve misurare:

- detection delay;
- tempo di resync;
- errore nuovo downbeat;
- overshoot o oscillazione;
- se il vecchio BPM e' stato mantenuto troppo a lungo;
- se il sistema ha cambiato BPM troppo presto.

Schema:

```json
{
  "adaptation_events": [
    {
      "event_type": "tempo_change",
      "reference_time_sec": 64.0,
      "old_bpm": 112.0,
      "new_bpm": 124.0,
      "detected_time_sec": 66.3,
      "detection_delay_sec": 2.3,
      "resync_completed_sec": 69.1,
      "resync_duration_sec": 5.1,
      "verdict": "too_slow"
    },
    {
      "event_type": "stop_restart",
      "reference_restart_sec": 92.0,
      "detected_restart_sec": 92.4,
      "downbeat_error_ms_after_restart": 63,
      "verdict": "acceptable"
    }
  ]
}
```

---

## 10. Pipeline pruning: cosa togliere o disattivare

Poiche' l'architettura e' prototipale, Codex deve aiutare a capire se un elemento e':

- utile;
- superfluo;
- prematuro;
- dannoso;
- troppo lento;
- ridondante;
- da sostituire.

Esempio:

```json
{
  "architectural_findings": [
    {
      "component": "harmonic_change_detector",
      "finding": "premature",
      "evidence": "Adds 180ms latency and does not improve one-bar grid alignment in current tests.",
      "recommendation": "Disable for phase 1; revisit when phrase tracking starts."
    },
    {
      "component": "high_band_onset_detector",
      "finding": "negative",
      "evidence": "Produces many false onsets on hi-hat-heavy tracks, causing phase jitter.",
      "recommendation": "Lower weight from 0.25 to 0.10 or gate by stability."
    },
    {
      "component": "low_band_pulse",
      "finding": "positive",
      "evidence": "Improves BPM stability by reducing std from 2.1 to 0.8 BPM.",
      "recommendation": "Keep enabled; use mainly for tempo, not downbeat."
    }
  ]
}
```

---

## 11. Feedback Markdown verso ChatGPT/Roberto

Ogni run deve avere anche un sommario Markdown breve e leggibile.

Template:

```md
# Audio2VideoPal telemetry - <run_id>

## Obiettivo della run
Costruire griglia 1-2-3-4 con downbeat corretto su file noto.

## Risultato sintetico
- Stato: partial_success
- BPM stimato: 112.1
- BPM reference: 112.0
- Tempo convergenza BPM: 5.8 s
- Tempo lock downbeat: 9.6 s
- Errore medio beat: 28.5 ms
- Errore downbeat: 44 ms
- Verdetto griglia: usable_but_needs_better_downbeat

## Cosa e' andato bene
- I moduli BPM convergono sullo stesso valore.
- La banda low migliora la stabilita'.
- La griglia non deraglia dopo il lock.

## Cosa e' andato male
- L'1 viene trovato troppo tardi.
- Il modulo high-band genera falsi onset.
- Il cambio armonico non aiuta ancora la griglia di una battuta.

## Componenti da tenere
- low_band_pulse
- onset_autocorrelation
- fused_bpm_tracker

## Componenti da ridurre/escludere per ora
- harmonic_change_detector
- high_band_onset_detector con peso alto

## Prossima modifica consigliata
Abbassare il peso high-band, aumentare il peso low-band per BPM e introdurre uno score downbeat separato dalla sola onset strength.
```

---

## 12. Feed HubMail telemetrico

Il feed HubMail deve includere una sintesi della telemetria.

Oggetto consigliato per email o messaggio:

```text
[HubMail][Audio2VideoPal][telemetry][partial_success] BPM locked, downbeat uncertain
```

Payload minimo:

```json
{
  "message_type": "telemetry_report",
  "project": "Audio2VideoPal",
  "run_id": "20260528-113000-demo",
  "summary": "BPM locked at 112.1, one-bar grid usable but downbeat confidence still low.",
  "status": "partial_success",
  "key_metrics": {
    "fused_bpm": 112.1,
    "bpm_error_abs": 0.1,
    "time_to_stable_bpm_sec": 5.8,
    "time_to_downbeat_lock_sec": 9.6,
    "mean_beat_error_ms": 28.5,
    "downbeat_error_ms": 44.0,
    "one_bar_grid_score": 0.76
  },
  "keep_components": ["low_band_pulse", "onset_autocorrelation"],
  "disable_or_reduce_components": ["harmonic_change_detector", "high_band_onset_detector"],
  "next_recommendation": "Improve downbeat scoring independently from BPM estimation."
}
```

---

## 13. Test suite consigliata

Codex deve predisporre file di test con difficulty crescente.

```text
level_01_metronome_100bpm.wav
level_02_kick_snare_112bpm.wav
level_03_rock_loop_112bpm.wav
level_04_song_intro_clear_downbeat.mp3
level_05_song_with_fill_and_restart.mp3
level_06_tempo_change_112_to_124.mp3
level_07_hi_hat_false_onsets.mp3
level_08_ambiguous_half_time.mp3
```

Per ogni file, quando possibile, creare:

```text
*.reference.json
```

Il player interno puo' anche generare pattern sintetici con BPM noto, ottimi per test automatici.

---

## 14. Soglie iniziali suggerite

Queste soglie sono provvisorie e devono essere aggiustate sperimentalmente.

```yaml
success_thresholds:
  bpm_error_abs_max: 1.0
  mean_beat_error_ms_max: 50
  downbeat_error_ms_max: 80
  time_to_stable_bpm_sec_max: 8
  time_to_downbeat_lock_sec_max: 12
  one_bar_grid_score_min: 0.70
  phase_confidence_min: 0.70
  downbeat_confidence_min: 0.65
```

Verdetti:

```text
success          tutte le soglie rispettate
partial_success  BPM buono ma fase/downbeat incerti
failure          BPM o griglia inutilizzabili
regression       peggiora rispetto alla run precedente
```

---

## 15. Confronto tra run

Codex deve salvare run precedenti e confrontarle.

Esempio:

```json
{
  "regression_check": {
    "baseline_run_id": "20260528-100000-demo",
    "current_run_id": "20260528-113000-demo",
    "improvements": [
      "BPM std reduced from 1.8 to 0.8",
      "time_to_stable_bpm reduced from 8.2s to 5.8s"
    ],
    "regressions": [
      "downbeat_error increased from 32ms to 44ms"
    ],
    "verdict": "mixed_improvement"
  }
}
```

---

## 16. Regola fondamentale per Codex

Codex non deve cercare di rendere tutto sofisticato subito.

Deve procedere cosi':

1. costruire una griglia di una battuta;
2. misurarla bene;
3. capire cosa la migliora o peggiora;
4. togliere i moduli inutili;
5. stabilizzare BPM e downbeat;
6. solo dopo estendere a piu' battute;
7. solo dopo lavorare su frasi, giri, ritornelli e predittivita'.

---

## 17. Messaggio operativo sintetico per Codex

Implementa una telemetria completa per ogni esecuzione della listening pipeline. Per ogni modulo registra input, output, peso, confidenza, latenza e contributo al risultato finale. Quando il player interno o un file noto fornisce BPM, beat e downbeat reference, calcola errore BPM, errore medio beat, errore downbeat, tempo di convergenza, tempo di adattamento e stabilita'. Produci JSON e Markdown leggibili da ChatGPT/Roberto. L'obiettivo iniziale e' validare una sola battuta 1-2-3-4 con l'1 corretto; tutto cio' che non aiuta questo obiettivo va marcato come superfluo, prematuro o dannoso e possibilmente escluso dalla pipeline.
