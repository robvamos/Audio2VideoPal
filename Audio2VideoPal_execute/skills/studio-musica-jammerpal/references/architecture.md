# Architecture

## Obiettivo

Costruire un sistema musicale live che:
- ascolta
- si allinea rapidamente al ritmo
- impara progressivamente la fase
- riconosce il beat `1`
- gestisce frasi piu' lunghe
- regola la propria presenza in base alla confidenza

## Pipeline consigliata

1. ingresso audio / microfono
2. riferimento del segnale autosuonato
3. preprocessing
4. onset / envelope
5. BPM detection a finestre
6. merge segmenti stabili
7. learning grid
8. tracking di fase e beat `1`
9. tracking di struttura (`4` battute, `16 grid`, altre sezioni)
10. convergenza musicale adattiva

## Regola chiave

La sottrazione del segnale autosuonato va fatta nel preprocessing, prima di qualsiasi analisi piu' alta.

## Strati logici

### Preprocessing layer

- latenza
- cancellazione del proprio output
- pulizia del segnale
- envelope / energia

### Tempo alignment layer

- BPM
- finestre brevi
- merge segmenti
- re-lock rapido

### Phase layer

- ordine dei quarti
- beat `1`
- finestre pesate
- taglio della battuta sbagliata

### Phrase / structure layer

- `4` battute
- `16 grid`
- blocchi ripetuti
- indizi timbrici o armonici

### Adaptive response layer

- discreto all'inizio
- piu' presente solo con confidenza alta
