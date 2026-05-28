# Models

Questo file raccoglie i modelli concettuali da passare al progetto ospite senza imporre una specifica implementazione.

L'intento e' lasciare a `Audio2VideoPal` la scelta di come realizzarli, ma consegnare in modo chiaro:
- il modello di pipeline
- il modello di song di test
- il modello di learning
- il modello di convergenza musicale
- il possibile ruolo di un modulo neurale

## 1. Modello di pipeline

Ordine consigliato:

1. ingresso audio / microfono
2. riferimento del segnale autosuonato
3. preprocessing e sottrazione del proprio output
4. onset / envelope
5. BPM detection a finestre
6. merge di segmenti stabili
7. learning grid
8. tracking di fase e beat `1`
9. tracking di frase / struttura (`4` battute, `16 grid`, altre sezioni)
10. convergenza musicale adattiva

Questo modello privilegia robustezza, latenza bassa e spiegabilita'.

## 2. Modello di song di test

I brani di test devono essere benchmark con verita' nota.

Devono chiarire:
- BPM attesi
- pause attese
- blocchi e sezioni
- punti in cui verificare beat `1`
- punti in cui verificare il re-lock

Tipi di test song:
- test di tempo
- test di fase
- test di struttura lunga

Libreria base gia' proposta:
- `phase_alignment_drill`
- `grid16_phrase_map`
- `tempo_transition_stress`
- `generic_reference_sample`
- `reference_live_calibration`

## 3. Modello di learning

Il sistema dovrebbe imparare in due modi:

### Learning supervisionato

Imparare sapendolo:
- campioni con ground truth nota
- BPM noti
- beat `1` noti
- struttura nota

### Learning con conferma

Imparare provando e chiedendo conferma:
- valutazione della configurazione
- feedback rapido utente
- nota breve

Questo modello permette di migliorare sia il riconoscimento tecnico sia il comportamento musicale.

## 4. Modello di valutazione configurazioni

Ogni configurazione significativa dovrebbe poter essere valutata.

Valutazioni minime:
- `scarso`
- `debole`
- `buono`
- `ottimo`

Da salvare:
- campione
- configurazione
- BPM dominante
- stabilita'
- readiness
- lock
- beat `1`
- resync
- rating
- nota

## 5. Modello di convergenza musicale

Il sistema non deve partire invasivo.

### Stadio 1: listening
- ascolta
- quasi nessuna presenza
- nessuna espansione prematura

### Stadio 2: aligning
- supporto cauto
- presenza limitata
- correzione controllata

### Stadio 3: supporting
- presenza riconoscibile
- piu' componenti
- supporto musicale utile

### Stadio 4: assertive
- intensita' piu' alta
- complessita' maggiore
- effetti piu' profondi

Ma solo se:
- pattern riconoscibile
- BPM stabile
- lock solido
- beat `1` non degrada

## 6. Modello di correzione

La correzione deve essere:
- rapida
- non nervosa
- non sbilanciata

Il sistema deve poter:
- riconoscere una battuta partita male
- tagliarla
- fare reset sync
- ripartire da zero in ascolto

## 7. Modello neurale possibile

Una rete neurale puo' essere utile come strato superiore.

Non dovrebbe sostituire subito:
- preprocessing
- BPM detection
- re-lock di base

Puo' invece aiutare su:
- struttura del brano
- continuita' ritmica
- indizi armonici o timbrici
- scelta delle configurazioni migliori
- previsione di pattern stabili

## 8. Regola di handoff

Questi modelli vanno interpretati come:
- intenzioni di sistema
- vincoli architetturali
- direzioni di progettazione

Non come implementazione obbligatoria.

Il progetto ospite e' libero di:
- scegliere il wiring concreto
- scegliere i servizi
- scegliere il runtime
- scegliere se e quando introdurre una rete neurale

## Riferimenti collegati

- [ARCHITECTURE.md](F:/_CODEX/Audio2VideoPal/Audio2VideoPal_execute/ARCHITECTURE.md)
- [SONG_TEST_AND_LEARNING_MODEL.md](F:/_CODEX/Audio2VideoPal/Audio2VideoPal_execute/SONG_TEST_AND_LEARNING_MODEL.md)
- [LEARNING_SYSTEM.md](F:/_CODEX/Audio2VideoPal/Audio2VideoPal_execute/LEARNING_SYSTEM.md)
- [TEST_LIBRARY.md](F:/_CODEX/Audio2VideoPal/Audio2VideoPal_execute/TEST_LIBRARY.md)
- [IMPLEMENTATION_ROADMAP.md](F:/_CODEX/Audio2VideoPal/Audio2VideoPal_execute/IMPLEMENTATION_ROADMAP.md)
