# HubMail / ChatGPT Feed - Audio2VideoPal wiring analysis

## Metadata

```json
{
  "schema_version": "1.0",
  "project": "Audio2VideoPal",
  "repo": "robvamos/Audio2VideoPal",
  "producer": "chatgpt",
  "target": ["codex"],
  "message_type": "code_analysis_and_task_request",
  "priority": "high",
  "created_at": "2026-05-28T12:00:00+02:00",
  "topic": "transform current Tauri command stubs into a modular audio listening pipeline"
}
```

---

## 1. Sintesi per Codex

ChatGPT ha analizzato il codice accessibile del repository. Il progetto ha gia' una struttura Tauri/React con alcuni moduli runtime, ma il wiring attuale e' ancora basato su comandi UI e stub, non su una vera pipeline dati.

Situazione attuale rilevata:

```text
React UI
  -> Tauri invoke command
  -> Rust function/stub
  -> log_event
  -> string message back to UI
```

Obiettivo richiesto:

```text
Audio frame
  -> preprocessing
  -> feature extraction
  -> BPM/downbeat analysis
  -> timing state
  -> one-bar grid 1-2-3-4
  -> telemetry
  -> future generation/output
```

Il prossimo lavoro deve concentrarsi sul passaggio da comandi isolati a un core modulare con event bus, moduli, pipeline, wiring configurabile e telemetria.

---

## 2. Elementi di codice gia' presenti

### 2.1 Frontend React

Percorso osservato:

```text
VisualMusic/src/App.tsx
```

Concetti presenti:

- tab `home`;
- tab `plugins`;
- tab `pipeline`;
- componente `AudioVideoPipeline`;
- stato UI `message`;
- invocazioni Tauri tramite servizi frontend.

La tab `pipeline` oggi e' un pannello di controllo, non ancora una control room della pipeline.

### 2.2 Componente pipeline frontend

Percorso osservato:

```text
VisualMusic/src/components/AudioVideoPipeline.tsx
```

Responsabilita' attuale:

- start/stop audio stream;
- start/stop video render;
- gestione stati `audioActive`, `videoActive`, `isBusy`;
- messaggi UI.

Limite attuale:

- non mostra moduli;
- non mostra wiring;
- non mostra BPM;
- non mostra griglia 1-2-3-4;
- non mostra telemetria;
- non ha ancora controlli per sorgente, preprocessing, moduli attivi o profili.

### 2.3 Backend audio Rust

Percorso osservato:

```text
VisualMusic/src-tauri/src/audio.rs
```

Concetti presenti:

```rust
AudioRuntimeState {
    active: bool,
    sample_rate: u32,
    channels: u16,
}
```

Comandi presenti:

```rust
start_audio_stream()
stop_audio_stream()
```

Limite attuale:

- avvia e ferma solo uno stub;
- registra eventi via `log_event`;
- non cattura frame audio reali;
- non emette eventi audio;
- non ha preprocessing;
- non ha pipeline BPM.

### 2.4 Backend video Rust

Percorso osservato:

```text
VisualMusic/src-tauri/src/video.rs
```

Concetti presenti:

```rust
VideoRuntimeState {
    active: bool,
    width: u32,
    height: u32,
    fps: u32,
}
```

Comandi presenti:

```rust
start_video_render()
stop_video_render()
```

Limite attuale:

- modulo runtime/stub;
- non riceve timing state;
- non riceve eventi musicali;
- non e' ancora collegato alla pipeline audio.

### 2.5 FFmpeg runtime

Percorso osservato:

```text
VisualMusic/src-tauri/src/ffmpeg.rs
```

Concetti presenti:

- `detect_ffmpeg()`;
- `batch_render_test()`;
- test render statico con `testsrc`.

Ruolo corretto:

- deve restare modulo export/render;
- non deve diventare il cuore della percezione musicale;
- in futuro deve ricevere eventi/timeline gia' generati dalla pipeline.

### 2.6 Plugin catalog / visualizer

Percorso osservato:

```text
VisualMusic/scantools/plugin_catalog_seed.json
```

Contiene riferimenti a:

- AVS;
- MilkDrop2;
- Goom.

Ruolo corretto:

- utile per futuro visual output;
- non deve interferire con la fase iniziale di listening/BPM/downbeat;
- trattarlo come layer visual futuro.

---

## 3. Problema architetturale attuale

Il wiring attuale e' implicito e molto semplice:

```text
button click -> invoke command -> backend stub -> return string
```

Questo e' sufficiente per una demo UI, ma non per un musicista software reattivo.

Serve introdurre un core interno con questi concetti:

```text
Event
EventBus
Module
Pipeline
PipelineProfile
TelemetryWriter
RuntimeState
```

---

## 4. Nuova struttura backend consigliata

Codex deve aggiungere progressivamente una struttura simile:

```text
VisualMusic/src-tauri/src/
  core/
    mod.rs
    event.rs
    bus.rs
    module.rs
    pipeline.rs
    wiring.rs
    telemetry.rs
    runtime_state.rs

  sources/
    mod.rs
    file_source.rs
    internal_player_source.rs
    microphone_source.rs
    synthetic_source.rs

  preprocessing/
    mod.rs
    normalizer.rs
    band_splitter.rs
    silence_detector.rs

  features/
    mod.rs
    onset_strength.rs
    low_band_pulse.rs
    rms_energy.rs

  analysis/
    mod.rs
    tempo_autocorrelation.rs
    simple_downbeat.rs
    beat_phase.rs

  fusion/
    mod.rs
    weighted_tempo_fusion.rs

  timing/
    mod.rs
    beat_grid.rs
    timing_state.rs
    one_bar_grid.rs

  telemetry/
    mod.rs
    run_report.rs
    module_report.rs
```

Non e' necessario implementare tutto subito. Ma il primo step deve creare il core giusto.

---

## 5. Primo obiettivo tecnico: minimal one-bar grid

Il primo profilo operativo deve essere:

```text
minimal_one_bar_grid
```

Pipeline minima:

```text
FileSource/InternalPlayerSource/SyntheticPatternSource
  -> Normalizer
  -> OnsetStrengthExtractor
  -> LowBandPulseExtractor
  -> TempoAutocorrelation
  -> WeightedTempoFusion
  -> BeatGridTracker
  -> SimpleDownbeatScorer
  -> OneBarGridEvaluator
  -> TelemetryWriter
```

Output minimo atteso:

```json
{
  "bpm": 112.0,
  "bpm_confidence": 0.80,
  "meter": "4/4",
  "beat_in_bar": 1,
  "downbeat_confidence": 0.70,
  "one_bar_grid_score": 0.75,
  "sync_state": "LOCKED_OR_TENTATIVE"
}
```

---

## 6. Nuovi tipi dati consigliati

### 6.1 Event

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineEvent {
    pub event_id: String,
    pub event_type: String,
    pub producer: String,
    pub time_sec: f64,
    pub confidence: Option<f64>,
    pub latency_ms: Option<f64>,
    pub payload: serde_json::Value,
    pub trace_id: String,
}
```

### 6.2 Module trait

```rust
pub trait PipelineModule {
    fn name(&self) -> &'static str;
    fn enabled(&self) -> bool;
    fn input_types(&self) -> Vec<&'static str>;
    fn output_types(&self) -> Vec<&'static str>;
    fn process(&mut self, event: &PipelineEvent, context: &mut PipelineContext) -> Vec<PipelineEvent>;
    fn telemetry(&self) -> serde_json::Value;
}
```

### 6.3 PipelineContext

```rust
pub struct PipelineContext {
    pub run_id: String,
    pub source_type: String,
    pub sample_rate: u32,
    pub current_time_sec: f64,
    pub latest_bpm: Option<f64>,
    pub latest_timing_state: Option<TimingState>,
    pub reference: Option<ReferenceTrack>,
}
```

### 6.4 TimingState

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimingState {
    pub sync_state: String,
    pub bpm: Option<f64>,
    pub meter: String,
    pub bar: Option<u64>,
    pub beat_in_bar: Option<u8>,
    pub next_beat_sec: Option<f64>,
    pub next_downbeat_sec: Option<f64>,
    pub tempo_confidence: f64,
    pub phase_confidence: f64,
    pub downbeat_confidence: f64,
}
```

---

## 7. Come trasformare `audio.rs`

Non eliminare subito `audio.rs`. Trasformarlo in facade/runtime entrypoint.

Da:

```text
audio.rs = start/stop stub
```

A:

```text
audio.rs = Tauri command facade per AudioPipelineRuntime
```

Nuovi comandi consigliati:

```rust
#[tauri::command]
pub fn start_listening_pipeline(profile: String, source: String) -> Result<String, String>

#[tauri::command]
pub fn stop_listening_pipeline() -> Result<String, String>

#[tauri::command]
pub fn run_listening_test(input_path: String, reference_path: Option<String>) -> Result<String, String>

#[tauri::command]
pub fn get_latest_timing_state() -> Result<String, String>

#[tauri::command]
pub fn get_latest_telemetry() -> Result<String, String>
```

I vecchi comandi `start_audio_stream` e `stop_audio_stream` possono restare come wrapper compatibili.

---

## 8. Come trasformare il frontend pipeline

`AudioVideoPipeline.tsx` deve evolvere da pulsanti start/stop a pannello di controllo.

Aggiungere progressivamente:

- selezione sorgente:
  - file;
  - internal player;
  - microphone;
  - synthetic pattern;
- selezione profilo:
  - minimal_one_bar_grid;
  - phrase_prototype;
  - live_microphone;
  - generative_drummer;
- start/stop listening pipeline;
- run test file;
- pannello BPM;
- pannello one-bar grid;
- pannello stato sync;
- pannello moduli attivi/disattivi;
- pannello telemetria.

UI minima consigliata:

```text
Pipeline profile: [minimal_one_bar_grid]
Source: [synthetic_pattern | file | internal_player | microphone]
[Run Listening Test]

BPM: 112.0 confidence 0.80
Grid: 1 2 3 4
Current beat: 1
Downbeat confidence: 0.70
State: LOCKED
```

---

## 9. File di configurazione wiring

Aggiungere:

```text
VisualMusic/configs/pipeline.minimal_one_bar_grid.json
```

Esempio:

```json
{
  "profile": "minimal_one_bar_grid",
  "source": {
    "type": "synthetic_pattern",
    "bpm": 112.0,
    "meter": "4/4",
    "duration_sec": 16.0
  },
  "modules": [
    {"name": "normalizer", "enabled": true},
    {"name": "onset_strength", "enabled": true},
    {"name": "low_band_pulse", "enabled": true, "weight": 0.30},
    {"name": "tempo_autocorrelation", "enabled": true, "weight": 0.40},
    {"name": "weighted_tempo_fusion", "enabled": true},
    {"name": "beat_grid_tracker", "enabled": true},
    {"name": "simple_downbeat_scorer", "enabled": true},
    {"name": "one_bar_grid_evaluator", "enabled": true}
  ],
  "thresholds": {
    "bpm_error_abs_max": 1.0,
    "mean_beat_error_ms_max": 50,
    "downbeat_error_ms_max": 80,
    "one_bar_grid_score_min": 0.70
  }
}
```

---

## 10. Telemetria obbligatoria

Ogni run deve produrre:

```text
VisualMusic/runtime/telemetry/<run_id>.telemetry.json
VisualMusic/runtime/telemetry/<run_id>.summary.md
```

Includere sempre:

- wiring effettivo;
- moduli attivi;
- moduli disattivi;
- BPM per modulo;
- BPM fuso;
- tempo convergenza;
- downbeat stimato;
- one-bar grid score;
- errori rispetto reference, se disponibile;
- raccomandazioni architetturali.

Esempio sintesi:

```json
{
  "run_id": "20260528-120000-synthetic-112",
  "profile": "minimal_one_bar_grid",
  "source": "synthetic_pattern",
  "status": "partial_success",
  "fused_bpm": 112.0,
  "bpm_confidence": 0.82,
  "sync_state": "LOCKED",
  "downbeat_confidence": 0.71,
  "one_bar_grid_score": 0.78,
  "recommendations": [
    "Keep tempo_autocorrelation enabled",
    "Do not enable harmonic analysis yet",
    "Add reference comparison before microphone work"
  ]
}
```

---

## 11. Priorita' implementative

### Step 1 - Core types

Creare:

```text
core/event.rs
core/module.rs
core/pipeline.rs
core/runtime_state.rs
core/telemetry.rs
```

Senza audio reale, anche solo con `SyntheticPatternSource`.

### Step 2 - SyntheticPatternSource

Prima di microfono/file reale, creare una sorgente sintetica con BPM noto:

```text
112 BPM, 4/4, downbeat noto, durata 16 secondi
```

Questo consente test automatici della grid 1-2-3-4.

### Step 3 - OneBarGridEvaluator

Implementare una valutazione minima:

- BPM stimato;
- beat duration;
- downbeat;
- beat 1/2/3/4;
- score.

### Step 4 - TelemetryWriter

Scrivere JSON + Markdown a ogni run.

### Step 5 - Tauri command integration

Collegare:

```text
run_listening_test()
get_latest_timing_state()
get_latest_telemetry()
```

### Step 6 - Frontend panel

Mostrare i risultati nel pannello `AudioVideoPipeline`.

---

## 12. Cosa NON fare ora

Non investire subito in:

- MilkDrop/AVS/Goom runtime;
- video rendering complesso;
- generatore batteria reale;
- machine learning pesante;
- UI molto elaborata;
- analisi armonica complessa;
- microfono live come primo target.

Prima serve dimostrare che il core sa produrre:

```text
BPM + griglia 1-2-3-4 + downbeat + telemetria
```

su una sorgente controllata.

---

## 13. Criterio di successo iniziale

Il primo successo del progetto non e': "suona una batteria".

Il primo successo e':

```text
Su synthetic/file reference noto, la pipeline produce una battuta 1-2-3-4 con BPM corretto, downbeat plausibile, score >= soglia e telemetry leggibile.
```

Output umano atteso:

```text
Source: synthetic_pattern 112 BPM
Profile: minimal_one_bar_grid
Fused BPM: 112.0
State: LOCKED
Grid: 1 2 3 4
Downbeat error: 0 ms
One-bar grid score: 1.00
```

---

## 14. Messaggio operativo sintetico

Codex, leggi questo feed e implementa prima il core modulare dietro gli stub Tauri. Non partire dal microfono reale e non partire dalla generazione sonora. Crea un event bus semplice, un trait modulo, una pipeline configurabile e una sorgente sintetica con BPM/downbeat noti. Usa questa sorgente per produrre una griglia 1-2-3-4 e telemetry JSON/Markdown. Poi collega il comando Tauri `run_listening_test` e aggiorna il pannello React `AudioVideoPipeline` per mostrare BPM, stato sync, downbeat e one-bar grid score.
