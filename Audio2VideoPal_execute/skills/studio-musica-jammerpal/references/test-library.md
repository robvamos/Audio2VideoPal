# Test Library

## Obiettivi

I song di test devono misurare:
- BPM tracking
- velocita' di aggancio
- re-lock dopo transizioni
- beat `1`
- fase
- struttura lunga

## Tipi di song di test

### Tempo

- blocchi a BPM noto
- pause note
- cambi di tempo

### Fase

- pattern regolari
- accenti chiari sul beat `1`
- battute ripetute

### Struttura

- frasi da `4` battute
- `16 grid`
- blocchi ricorrenti

## Libreria base utile

- `phase_alignment_drill`
- `grid16_phrase_map`
- `tempo_transition_stress`
- `generic_reference_sample`
- `reference_live_calibration`

## Evoluzione futura

Aggiungi:
- campioni con tonalita' diverse
- transizioni difficili
- casi molto stabili
- casi ambigui
- rumore ambiente
