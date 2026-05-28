# Implementation Roadmap

## Fase 1

Mettere in piedi il nucleo tecnico:
- preprocessing
- latenza
- sottrazione dell'autosuonato
- onset / envelope
- BPM detection a finestre

## Fase 2

Costruire il comportamento di allineamento:
- merge segmenti stabili
- lock sul tempo
- correzione veloce ma controllata
- reset sync e taglio battuta se necessario

## Fase 3

Entrare nella fase musicale vera:
- beat `1`
- ordine dei quarti
- peso diverso delle finestre
- metrica di efficacia della fase

## Fase 4

Gestire la struttura:
- `16 grid`
- frasi di `4` battute
- blocchi da `6`, `7`, `2` se il segnale e' stabile
- uso eventuale di cambi timbrici o armonici

## Fase 5

Adattare l'output:
- partire quasi invisibile
- crescere con la confidenza
- aumentare volume, componenti o effetti solo quando conviene

## Fase 6

Learning avanzato:
- training archive unificato
- storico configurazioni
- feedback utente
- eventuale modulo neurale come strato superiore
