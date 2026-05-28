# Audio2VideoPal - Modular Wiring Architecture

## 1. Scopo

Questo documento definisce il modello di wiring e l'architettura modulare della pipeline Audio2VideoPal: dal suono in ingresso fino alla parte generativa che decide cosa suonare in uscita.

L'obiettivo e' evitare un monolite. Ogni fase deve essere un modulo collegabile, misurabile, sostituibile e disattivabile.

Il progetto deve poter partire semplice:

```text
file/player/microfono -> BPM -> griglia 1-2-3-4 -> eventi base -> output semplice
```

ma deve essere predisposto per evolvere verso:

```text
ascolto live -> comprensione musicale -> predizione -> accompagnamento reattivo -> feedback-aware listening
```

---

## 2. Principio guida

La pipeline deve essere costruita come una rete di moduli con contratti chiari.

Ogni modulo deve dichiarare:

- quali input consuma;
- quali output produce;
- quanto e' affidabile;
- quanta latenza introduce;
- quanto pesa nella decisione finale;
- se e' sperimentale, stabile, disattivato o dannoso;
- quali metriche produce per la telemetria.

Non tutti i moduli devono essere attivi. Nella fase iniziale si deve mantenere attiva solo la parte utile a costruire una griglia di una battuta:

```text
1 2 3 4
^
downbeat corretto
```

---

## 3. Vista complessiva della pipeline

```text
[Audio Sources]
      |
      v
[Input Router]
      |
      v
[Preprocessing Layer]
      |
      v
[Feature Extraction Layer]
      |
      v
[Parallel Analysis Modules]
      |
      v
[Evidence Fusion Layer]
      |
      v
[Timing State Layer]
      |
      v
[Musical Structure Layer]
      |
      v
[Decision / Intention Layer]
      |
      v
[Generative Planning Layer]
      |
      v
[Performance Scheduler]
      |
      v
[Sound / MIDI / Visual Output]
      |
      v
[Output Feedback Guard]
      |
      v
[Telemetry + HubMail Feed]
```

---

## 4. Famiglie di moduli

### 4.1 Audio Sources

Responsabilita': produrre frame audio timestampati.

Moduli:

```text
FileSource
InternalPlayerSource
MicrophoneSource
LoopbackSource
SyntheticPatternSource
```

Contratto output:

```json
{
  "type": "audio_frame",
  "source_id": "internal_player",
  "time_sec": 12.500,
  "sample_rate": 44100,
  "channels": 2,
  "frame_size": 1024,
  "samples_ref": "buffer://frame/000123",
  "known_transport_time": true
}
```

Note:

- `FileSource` serve per analisi offline.
- `InternalPlayerSource` serve per test ripetibili e confronto con ground truth.
- `MicrophoneSource` serve per live reale.
- `SyntheticPatternSource` serve per test automatici con BPM/downbeat noti.

---

### 4.2 Input Router

Responsabilita': scegliere, sincronizzare e normalizzare la sorgente attiva.

Deve supportare:

```yaml
input:
  active_source: internal_player
  fallback_source: file
  allow_source_switch: true
```

Output:

```json
{
  "type": "routed_audio_frame",
  "source_id": "internal_player",
  "time_sec": 12.500,
  "transport_state": "playing",
  "latency_estimate_ms": 20,
  "samples_ref": "buffer://routed/000123"
}
```

---

### 4.3 Preprocessing Layer

Responsabilita': rendere il segnale analizzabile.

Moduli possibili:

```text
DCOffsetRemoval
Normalizer
NoiseGate
LightCompressor
BandSplitter
TransientEnhancer
SilenceDetector
```

Output tipico:

```json
{
  "type": "preprocessed_frame",
  "time_sec": 12.500,
  "full_band_ref": "buffer://pre/full/000123",
  "bands": {
    "low": "buffer://pre/low/000123",
    "low_mid": "buffer://pre/low_mid/000123",
    "mid": "buffer://pre/mid/000123",
    "high_mid": "buffer://pre/high_mid/000123",
    "high": "buffer://pre/high/000123"
  },
  "level": {
    "rms": 0.42,
    "peak": 0.81,
    "silence_score": 0.02
  }
}
```

Regola importante: ogni filtro deve essere disattivabile. In fase prototipale un filtro puo' migliorare un caso e peggiorarne un altro.

---

### 4.4 Feature Extraction Layer

Responsabilita': trasformare audio preprocessato in feature.

Moduli:

```text
RmsEnergyExtractor
OnsetStrengthExtractor
SpectralFluxExtractor
LowBandPulseExtractor
HighBandTransientExtractor
ChromaExtractor
HarmonicChangeExtractor
NoveltyCurveExtractor
SelfSimilarityExtractor
```

Output:

```json
{
  "type": "feature_frame",
  "time_sec": 12.500,
  "features": {
    "rms_energy": 0.63,
    "onset_strength_full": 0.81,
    "onset_strength_low": 0.55,
    "onset_strength_high": 0.91,
    "low_band_pulse": 0.77,
    "spectral_flux": 0.48,
    "harmonic_change": 0.22,
    "novelty": 0.39
  }
}
```

---

### 4.5 Parallel Analysis Modules

Responsabilita': proporre interpretazioni musicali.

Moduli iniziali:

```text
AubioTempoModule
LibrosaBeatModule
OnsetAutocorrelationModule
LowBandPulseTempoModule
SimpleDownbeatScorer
BeatPhaseTracker
```

Moduli futuri:

```text
MadmomDownbeatModule
HarmonicPhraseBoundaryModule
SelfSimilarityPhraseModule
GenreAwarePriorModule
StopRestartDetector
TempoChangeDetector
```

Output di un modulo:

```json
{
  "type": "analysis_candidate",
  "module": "onset_autocorrelation",
  "time_sec": 12.500,
  "candidate_type": "tempo",
  "value": {
    "bpm": 112.1,
    "period_sec": 0.535
  },
  "confidence": 0.78,
  "latency_ms": 42,
  "window_sec": 8.0,
  "evidence": ["onset_periodicity", "stable_recent_intervals"]
}
```

---

### 4.6 Evidence Fusion Layer

Responsabilita': fondere candidati diversi in una decisione coerente.

Non deve fare analisi audio diretta. Deve ricevere opinioni dai moduli e decidere.

Input:

```text
analysis_candidate[]
feature_frame[]
previous_timing_state
configuration weights
reference data when available
```

Output:

```json
{
  "type": "fused_timing_estimate",
  "time_sec": 12.500,
  "bpm": 112.0,
  "bpm_confidence": 0.84,
  "beat_period_sec": 0.5357,
  "phase_sec": 0.420,
  "phase_confidence": 0.76,
  "downbeat_sec": 0.420,
  "downbeat_confidence": 0.69,
  "meter": "4/4",
  "active_modules": ["low_band_pulse", "onset_autocorrelation", "simple_downbeat_scorer"],
  "suppressed_modules": ["harmonic_change_detector"]
}
```

Regola: la fusione deve essere trasparente. La telemetria deve spiegare perche' ha scelto quel BPM/downbeat.

---

### 4.7 Timing State Layer

Responsabilita': mantenere lo stato musicale nel tempo.

Stati:

```text
SEARCHING
TENTATIVE
LOCKED
COASTING
DRIFTING
RESYNCING
LOST
```

Output:

```json
{
  "type": "timing_state",
  "time_sec": 12.500,
  "sync_state": "LOCKED",
  "bpm": 112.0,
  "meter": "4/4",
  "bar": 4,
  "beat_in_bar": 2,
  "next_beat_sec": 12.956,
  "next_downbeat_sec": 14.028,
  "tempo_confidence": 0.86,
  "phase_confidence": 0.79,
  "downbeat_confidence": 0.72
}
```

Questo layer e' il primo vero clock musicale del progetto.

---

### 4.8 Musical Structure Layer

Responsabilita': capire battute, frasi, giri e sezioni.

Per la fase iniziale deve essere molto semplice:

```text
conta battute in gruppi da 4
ipotizza inizio/fine giro
produce confidenza bassa/media
```

Output:

```json
{
  "type": "structure_state",
  "time_sec": 32.000,
  "bar": 16,
  "beat_in_bar": 1,
  "phrase_length_guess_bars": 4,
  "bar_in_phrase": 1,
  "is_phrase_start": true,
  "is_phrase_end": false,
  "section_guess": "unknown_or_chorus",
  "confidence": 0.52
}
```

Moduli futuri:

```text
PhraseCounter
RepetitionDetector
EnergyBoundaryDetector
HarmonicBoundaryDetector
SectionPredictor
```

---

### 4.9 Decision / Intention Layer

Responsabilita': decidere cosa il sistema vuole fare musicalmente.

Esempi:

```text
non suonare ancora perche' non sono locked
suonare solo metronomo interno debole
suonare cassa sull'1
fare fill alla fine frase
ridurre intensita' perche' input si e' fermato
aspettare resync
```

Input:

```text
timing_state
structure_state
sync_state
confidence
user_config
style_profile
```

Output:

```json
{
  "type": "musical_intention",
  "time_sec": 32.000,
  "mode": "supportive_drumming",
  "should_play": true,
  "intensity": 0.45,
  "risk_level": "low",
  "intents": [
    {"action": "kick_on_downbeat", "target_time_sec": 32.000, "confidence_required": 0.70},
    {"action": "hihat_quarters", "start_time_sec": 32.000, "duration_bars": 1}
  ],
  "reason": "Timing locked and phrase start detected."
}
```

Regola: se la confidenza e' bassa, il sistema deve suonare meno o non suonare.

---

### 4.10 Generative Planning Layer

Responsabilita': trasformare intenzioni in eventi musicali concreti.

Moduli futuri:

```text
DrumPatternGenerator
FillGenerator
BassLineGenerator
VisualCueGenerator
MidiEventGenerator
ArrangementResponder
```

Output:

```json
{
  "type": "performance_plan",
  "time_sec": 32.000,
  "events": [
    {"event_type": "midi_note", "instrument": "kick", "note": 36, "velocity": 92, "time_sec": 32.000},
    {"event_type": "midi_note", "instrument": "snare", "note": 38, "velocity": 76, "time_sec": 33.071},
    {"event_type": "visual_event", "name": "downbeat_flash", "time_sec": 32.000}
  ],
  "generated_from": "supportive_drumming_intention",
  "confidence_guard": "passed"
}
```

---

### 4.11 Performance Scheduler

Responsabilita': emettere eventi al momento giusto.

Deve gestire:

- lookahead;
- latenza audio;
- jitter;
- cancellazione eventi se il lock viene perso;
- quantizzazione alla griglia;
- swing/groove futuro;
- priorita' eventi.

Output:

```json
{
  "type": "scheduled_event",
  "event_id": "evt_000123",
  "target_time_sec": 32.000,
  "scheduled_time_sec": 31.940,
  "lookahead_ms": 60,
  "output_target": "midi_or_audio_engine",
  "status": "scheduled"
}
```

---

### 4.12 Sound / MIDI / Visual Output

Responsabilita': produrre output.

Target possibili:

```text
InternalSynth
SampleDrummer
MidiOut
OSCOut
VisualEngine
VideoRenderer
```

Output feedback event:

```json
{
  "type": "system_output_event",
  "time_sec": 32.000,
  "event_type": "kick",
  "source": "audio2videopal",
  "should_be_ignored_by_listener": true,
  "expected_bleed_window_ms": 120
}
```

---

### 4.13 Output Feedback Guard

Responsabilita': evitare che il sistema insegua se stesso.

Deve ricevere tutti gli eventi prodotti dal sistema e usarli per marcare o filtrare gli onset corrispondenti nel microfono.

Strategie:

```text
ignore window dopo evento generato
adaptive echo cancellation futura
sottrazione segnale noto
riduzione peso onset coincidenti con output del sistema
separazione input/output quando possibile
```

Output:

```json
{
  "type": "feedback_guard_decision",
  "time_sec": 32.020,
  "detected_onset_sec": 32.015,
  "near_system_output": true,
  "action": "downweight",
  "reason": "Onset occurs 15ms after generated kick."
}
```

---

## 5. Event Bus interno

Il progetto dovrebbe usare un event bus interno semplice.

Ogni messaggio deve avere una struttura comune:

```json
{
  "event_id": "uuid-or-sequential-id",
  "type": "event_type",
  "producer": "module_name",
  "time_sec": 12.500,
  "created_at": "2026-05-28T12:00:00+02:00",
  "payload": {},
  "confidence": 0.80,
  "latency_ms": 25,
  "trace_id": "run-id-or-chain-id"
}
```

Tipi evento principali:

```text
audio_frame
preprocessed_frame
feature_frame
analysis_candidate
fused_timing_estimate
timing_state
structure_state
musical_intention
performance_plan
scheduled_event
system_output_event
telemetry_event
feedback_guard_decision
```

---

## 6. Wiring configurabile

Il wiring deve essere dichiarativo, preferibilmente YAML.

Esempio:

```yaml
pipeline:
  source: internal_player

  preprocessing:
    - name: dc_offset_removal
      enabled: true
    - name: normalizer
      enabled: true
    - name: band_splitter
      enabled: true
      bands:
        low: [20, 120]
        low_mid: [120, 500]
        mid: [500, 2000]
        high_mid: [2000, 6000]
        high: [6000, 12000]

  feature_extractors:
    - name: rms_energy
      enabled: true
    - name: onset_strength
      enabled: true
    - name: low_band_pulse
      enabled: true
    - name: harmonic_change
      enabled: false

  analyzers:
    - name: onset_autocorrelation
      enabled: true
      weight: 0.35
    - name: low_band_tempo
      enabled: true
      weight: 0.30
    - name: aubio_tempo
      enabled: true
      weight: 0.25
    - name: simple_downbeat_scorer
      enabled: true
      weight: 0.10

  fusion:
    name: weighted_evidence_fusion
    reject_outliers: true
    half_double_time_guard: true

  timing:
    default_meter: "4/4"
    adaptation_rate: 0.15
    max_phase_shift_ms: 80

  generation:
    enabled: false
    mode: silent_telemetry_only
```

Per la fase iniziale la generazione sonora puo' essere disabilitata. Il sistema deve prima imparare ad ascoltare.

---

## 7. Profili di pipeline

Codex deve prevedere profili diversi.

### 7.1 Profilo minimal one-bar grid

Obiettivo: una battuta 1-2-3-4.

```text
File/InternalPlayer
 -> normalize
 -> onset strength
 -> low band pulse
 -> BPM fusion
 -> phase tracker
 -> simple downbeat scorer
 -> one-bar grid telemetry
```

Disattivare:

```text
harmonic analysis
section prediction
drummer generation
complex phrase model
```

### 7.2 Profilo phrase prototype

Obiettivo: contare piu' battute e giri.

Aggiungere:

```text
phrase counter
energy boundary detector
repetition detector
```

### 7.3 Profilo live microphone

Obiettivo: ascolto live.

Aggiungere:

```text
latency estimation
coasting/resync state
feedback guard
noise gate
```

### 7.4 Profilo generative drummer

Obiettivo: suonare sopra.

Aggiungere:

```text
decision layer
pattern generator
scheduler
sound output
feedback guard mandatory
```

---

## 8. Contratti tra moduli

Ogni modulo deve implementare idealmente una interfaccia simile:

```python
class Module:
    name: str
    enabled: bool
    inputs: list[str]
    outputs: list[str]

    def configure(self, config: dict) -> None:
        ...

    def process(self, event, context) -> list[Event]:
        ...

    def telemetry(self) -> dict:
        ...
```

Per i moduli stateful:

```python
class StatefulModule(Module):
    def reset(self) -> None:
        ...

    def snapshot_state(self) -> dict:
        ...

    def restore_state(self, state: dict) -> None:
        ...
```

---

## 9. Context condiviso

Il context non deve essere un grande oggetto confuso. Deve contenere solo stato comune essenziale.

```json
{
  "run_id": "20260528-120000-demo",
  "clock": {
    "audio_time_sec": 12.500,
    "wall_time_sec": 123456.78
  },
  "transport": {
    "source": "internal_player",
    "state": "playing"
  },
  "latest_timing_state": {},
  "latest_structure_state": {},
  "system_output_history": [],
  "config": {},
  "reference": {}
}
```

Regola: i moduli devono comunicare soprattutto tramite eventi, non leggendo e modificando liberamente stato globale.

---

## 10. Percorso dati iniziale consigliato

Per iniziare Codex deve implementare questo wiring minimo:

```text
FileSource/InternalPlayerSource
  -> Normalizer
  -> BandSplitter
  -> OnsetStrengthExtractor
  -> LowBandPulseExtractor
  -> OnsetAutocorrelationTempo
  -> WeightedTempoFusion
  -> BeatGridTracker
  -> SimpleDownbeatScorer
  -> OneBarGridEvaluator
  -> TelemetryWriter
```

Output minimo:

```text
BPM fuso
confidenza BPM
stato sync
beat 1-2-3-4 stimato
errore rispetto reference se disponibile
telemetria moduli
```

---

## 11. Quando introdurre la parte generativa

La generazione sonora deve arrivare solo quando:

```text
BPM stabile
phase confidence sufficiente
downbeat confidence accettabile
one_bar_grid_score >= soglia
```

Prima generazione consigliata:

```text
silent generation: crea eventi ma non li suona
```

Poi:

```text
metronome ghost output
```

Poi:

```text
kick leggero sull'1
```

Poi:

```text
pattern batteria semplice
```

Poi:

```text
fill a fine frase
```

---

## 12. Generative pipeline dettagliata

```text
TimingState + StructureState
  -> ConfidenceGuard
  -> MusicalIntentionSelector
  -> PatternGenerator
  -> Humanization/GrooveLayer
  -> PerformanceScheduler
  -> OutputEngine
  -> OutputEventRegistry
  -> FeedbackGuard
```

### 12.1 ConfidenceGuard

Blocca o limita l'output se la percezione e' incerta.

```json
{
  "should_generate": false,
  "reason": "downbeat_confidence_below_threshold",
  "required": 0.70,
  "actual": 0.52
}
```

### 12.2 MusicalIntentionSelector

Decide il ruolo:

```text
silent
metronome_support
minimal_drums
supportive_drums
fill_response
stop_response
resync_wait
```

### 12.3 PatternGenerator

Produce eventi musicali astratti:

```json
{
  "pattern": "basic_rock_4_4",
  "events": [
    {"beat": 1, "instrument": "kick"},
    {"beat": 2, "instrument": "snare"},
    {"beat": 3, "instrument": "kick"},
    {"beat": 4, "instrument": "snare"}
  ]
}
```

### 12.4 Scheduler

Trasforma beat relativi in timestamp assoluti.

```json
{
  "beat": 1,
  "bar": 12,
  "target_time_sec": 64.000,
  "instrument": "kick"
}
```

### 12.5 OutputEventRegistry

Registra quello che e' stato suonato per evitare feedback.

---

## 13. Moduli da evitare nella fase iniziale

Per non complicare troppo la one-bar grid, Codex deve considerare disattivabili:

```text
section predictor avanzato
modello armonico complesso
generatore batteria reale
humanization avanzata
machine learning pesante
UI complessa
video rendering complesso
```

Questi elementi possono essere utili dopo, ma nella fase iniziale rischiano di nascondere i problemi di base.

---

## 14. Telemetria obbligatoria per wiring

Ogni run deve indicare il wiring effettivo:

```json
{
  "wiring": {
    "profile": "minimal_one_bar_grid",
    "active_modules": [
      "FileSource",
      "Normalizer",
      "BandSplitter",
      "OnsetStrengthExtractor",
      "LowBandPulseExtractor",
      "OnsetAutocorrelationTempo",
      "WeightedTempoFusion",
      "BeatGridTracker",
      "SimpleDownbeatScorer",
      "OneBarGridEvaluator"
    ],
    "disabled_modules": [
      "HarmonicChangeExtractor",
      "SectionPredictor",
      "DrumPatternGenerator"
    ],
    "module_edges": [
      ["FileSource", "Normalizer"],
      ["Normalizer", "BandSplitter"],
      ["BandSplitter", "LowBandPulseExtractor"],
      ["OnsetStrengthExtractor", "OnsetAutocorrelationTempo"],
      ["OnsetAutocorrelationTempo", "WeightedTempoFusion"],
      ["WeightedTempoFusion", "BeatGridTracker"]
    ]
  }
}
```

Questo serve a ChatGPT/Roberto per capire non solo il risultato, ma la forma della pipeline che ha prodotto quel risultato.

---

## 15. Directory consigliate

```text
src/audio2videopal/
  core/
    event.py
    bus.py
    module.py
    context.py
    wiring.py
  sources/
    file_source.py
    internal_player_source.py
    microphone_source.py
    synthetic_source.py
  preprocessing/
    normalizer.py
    band_splitter.py
    noise_gate.py
  features/
    onset_strength.py
    low_band_pulse.py
    spectral_flux.py
    harmonic_change.py
  analysis/
    tempo_autocorrelation.py
    aubio_tempo.py
    downbeat_scorer.py
  fusion/
    weighted_fusion.py
  timing/
    beat_grid_tracker.py
    timing_state.py
  structure/
    phrase_counter.py
    boundary_detector.py
  decision/
    confidence_guard.py
    intention_selector.py
  generation/
    drum_pattern_generator.py
    performance_scheduler.py
    output_registry.py
  output/
    midi_out.py
    audio_out.py
    visual_out.py
  telemetry/
    telemetry_writer.py
    run_report.py
```

---

## 16. Messaggio operativo sintetico per Codex

Definisci Audio2VideoPal come una pipeline modulare cablata da configurazione. Ogni modulo deve avere input, output, stato, telemetria, latenza e confidenza. Parti dal profilo `minimal_one_bar_grid`: sorgente file/player, preprocessing, onset/low-band pulse, BPM fusion, beat grid, downbeat scorer, one-bar evaluator e telemetry writer. La generazione sonora deve restare disabilitata finche' la grid 1-2-3-4 non e' stabile. Quando verra' attivata, deve passare da confidence guard, intention selector, pattern generator, scheduler, output engine e feedback guard, registrando tutto cio' che viene suonato per evitare che il sistema insegua se stesso.
