# Listening Evolution Roadmap

Questo documento traduce i modelli presenti in `Audio2VideoPal_execute/` in una roadmap tecnica concreta per `VisualMusic`.

## Stato attuale

Il progetto oggi copre in modo reale:
- UI separata per `Overview`, `System`, `Plugins`, `Control Room`, `Pipeline`, `Wiring`, `Telemetry`
- pipeline minima `minimal_one_bar_grid`
- sorgente sintetica deterministica a `112 BPM`
- telemetria JSON e Markdown
- wiring esplicito dei moduli attivi e disattivi
- primo layer di preprocessing con riferimento dell'output e stima della cancellazione residua

## Slice 1 completato

Obiettivo:
- fissare una baseline stabile e spiegabile

Consegne:
- `synthetic_pattern`
- griglia `1 2 3 4`
- BPM stabile
- beat `1` plausibile
- telemetria leggibile

## Slice 2 in corso

Obiettivo:
- introdurre preprocessing e riferimento dell'autosuonato prima delle analisi piu' alte

Consegne minime:
- modulo `self_output_reference`
- modulo `self_output_subtractor`
- metrica `residual_energy_ratio`
- metrica `cancellation_db`
- metrica `latency_alignment_ms`

Gate:
- il residuo deve restare basso su benchmark di riferimento
- il lock non deve degradare rispetto alla baseline sintetica

## Slice 3

Obiettivo:
- introdurre libreria di song di test con verita' nota

Consegne:
- `phase_alignment_drill`
- `grid16_phrase_map`
- `tempo_transition_stress`
- `generic_reference_sample`
- `reference_live_calibration`

Gate:
- benchmark eseguibili
- outcome attesi dichiarati
- telemetria confrontabile tra run

## Slice 4

Obiettivo:
- valutazione configurazioni e learning supervisionato

Consegne:
- rating `scarso`, `debole`, `buono`, `ottimo`
- salvataggio nota utente
- confronto tra configurazioni
- readiness e relock come metriche esplicite

## Slice 5

Obiettivo:
- tracking di struttura lunga e convergenza musicale adattiva

Consegne:
- frasi da `4` battute
- `16 grid`
- supporto musicale graduato per stadi `listening`, `aligning`, `supporting`, `assertive`

## Regole di implementazione

- niente espansione musicale prima di lock, beat `1` e preprocessing affidabili
- niente dipendenza iniziale da moduli neurali
- ogni slice deve mantenere telemetria leggibile e verificabile
- ogni nuovo modulo deve comparire in `Pipeline`, `Wiring` e `Learning Lab`
