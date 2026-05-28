# Test Library

## Scopo

La libreria di test serve a verificare:
- efficienza dello stadio di allineamento ritmico
- velocita' di correzione
- riconoscimento progressivo della fase
- tracking di strutture piu' lunghe

## Brani base consigliati

### 1. `phase_alignment_drill`

Scopo:
- verificare la lettura del beat `1`
- testare materiale stabile con blocchi ripetuti

Caratteristiche:
- `96 BPM`
- blocchi regolari
- pause minime
- ideale per la fase

### 2. `grid16_phrase_map`

Scopo:
- verificare il tracking di una forma lunga
- capire dove siamo in una struttura da `16 grid`

Caratteristiche:
- due zone di tempo note
- blocchi stabili
- utile per frase e struttura

### 3. `tempo_transition_stress`

Scopo:
- misurare quanto velocemente il sistema si riallinea
- verificare che non si sbilanci durante i cambi

Caratteristiche:
- piu' regioni di tempo
- breve pausa
- stress test sul re-lock

## Altri campioni utili

- `generic_reference_sample`
- `reference_live_calibration`

Questi servono soprattutto come base di calibrazione generale del preprocessing e del BPM tracking.

## Evoluzione futura

La libreria puo' crescere con:
- campioni con tonalita' o timbri diversi
- pattern da `4`, `8`, `16` e oltre
- transizioni difficili
- pause rumorose
- casi molto stabili e casi volutamente ambigui
