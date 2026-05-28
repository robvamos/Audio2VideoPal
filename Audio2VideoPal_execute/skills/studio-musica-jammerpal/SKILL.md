---
name: studio-musica-jammerpal
description: Progetta, struttura o fa evolvere sistemi musicali live orientati ad ascolto, improvvisazione, BPM detection, fase del brano, beat 1, learning supervisionato, feedback utente e convergenza musicale adattiva. Usa questa skill quando il lavoro riguarda musicista improvvisatore, reazione live, song di test, preprocessing audio, riallineamento ritmico, griglie da 4/16 battute, comportamento non invasivo all'inizio e crescita di presenza solo quando la confidenza aumenta.
---

# Studio Musica JammerPal

## Overview

Usa questa skill per lavorare su moduli musicali live che devono ascoltare, capire il ritmo, convergere velocemente senza sbilanciarsi e diventare piu' presenti solo quando la lettura del brano e' davvero affidabile.

Questa skill e' adatta sia per progettazione architetturale sia per implementation planning, refactor concettuale, dataset/test design e definizione del comportamento cognitivo-musicale del sistema.

## Workflow

### 1. Metti a fuoco il livello giusto

Prima di proporre soluzioni, distingui chiaramente questi strati:
- preprocessing e soppressione del segnale autosuonato
- BPM detection e finestre stabili
- fase del brano e beat `1`
- tracking di frasi piu' lunghe (`4` battute, `16 grid`, sezioni)
- convergenza musicale adattiva
- eventuale strato neurale superiore

Non mischiare questi livelli in un unico blocco logico.

### 2. Dai priorita' al nucleo deterministico

Prima vengono sempre:
- preprocessing
- onset / envelope
- BPM tracking
- re-lock rapido

Solo dopo vengono:
- fase
- frase
- struttura
- eventuale modello neurale

Se una proposta mette una rete neurale prima di una base DSP/classica stabile, correggi la direzione.

### 3. Mantieni la convergenza non invasiva all'inizio

Il sistema deve:
- partire leggero
- ascoltare
- evitare correzioni teatrali o premature
- aumentare intensita', componenti ed effetti solo con confidenza alta

Quando descrivi il comportamento del sistema, esplicita sempre:
- cosa fa a bassa confidenza
- cosa fa a confidenza media
- cosa fa ad alta confidenza

### 4. Ragiona sempre in termini di test song

Quando progetti o valuti il sistema, chiediti:
- come verifichiamo BPM?
- come verifichiamo beat `1`?
- come verifichiamo re-lock dopo un cambio?
- come verifichiamo struttura lunga?

Se mancano i brani di test, progetta una libreria con verita' nota.

### 5. Usa due modalita' di learning

Il sistema dovrebbe imparare in due modi:
- `sapendolo`: campioni con verita' nota
- `provando e chiedendo conferma`: feedback utente sulla configurazione

Ogni volta che proponi un sistema di learning, specifica sempre:
- cosa viene etichettato automaticamente
- cosa richiede conferma umana
- cosa va salvato nello storico

### 6. Tratta la configurazione come oggetto di apprendimento

Non apprendere solo dal segnale. Valuta anche la configurazione usata:
- soglie
- pesi
- tolleranze
- strategia di resync
- intensita' suggerita

Il sistema deve poter salvare:
- configurazione
- esito tecnico
- giudizio utente
- nota breve

## Output atteso

Quando usi questa skill, produci preferibilmente uno o piu' di questi output:
- schema architetturale della pipeline
- piano di implementazione per strati
- definizione di song di test
- modello di learning e feedback
- regole di convergenza musicale
- proposta di modulo o servizio software

## Riferimenti

Leggi questi file quando servono dettagli:
- [references/architecture.md](F:/_CODEX/Audio2VideoPal/Audio2VideoPal_execute/skills/studio-musica-jammerpal/references/architecture.md): pipeline, wiring e strati logici
- [references/learning.md](F:/_CODEX/Audio2VideoPal/Audio2VideoPal_execute/skills/studio-musica-jammerpal/references/learning.md): modello di learning, feedback, configurazioni e rete neurale
- [references/test-library.md](F:/_CODEX/Audio2VideoPal/Audio2VideoPal_execute/skills/studio-musica-jammerpal/references/test-library.md): song di test, libreria base e obiettivi di verifica

Usa come contesto operativo del progetto anche:
- [Audio2VideoPal_execute](F:/_CODEX/Audio2VideoPal/Audio2VideoPal_execute)
