# Song Test And Learning Model

## Intento

Questo documento raccoglie in forma unica i concetti chiave per:
- progettare i `song di test`
- definire il `modello di learning`
- chiarire come il sistema dovrebbe imparare
- spiegare come usare feedback e configurazioni

L'idea di base e' che il sistema non deve solo "capire il BPM", ma deve imparare a:
- allinearsi in fretta
- non sbilanciarsi
- capire la fase
- capire dove cade l'`1`
- riconoscere strutture piu' lunghe quando il segnale e' stabile

## Ordine corretto della pipeline

Il flusso corretto e' questo:

1. ingresso microfono o audio
2. riferimento del segnale che il sistema sta suonando
3. preprocessing e sottrazione del proprio output
4. envelope / onset detection
5. BPM detection e merge di finestre stabili
6. learning grid
7. tracking di fase e beat `1`
8. frase / struttura (`16 grid`, blocchi di battute, sezioni)
9. convergenza musicale adattiva

La sottrazione del segnale autosuonato deve avvenire nel preprocessing, prima di scomporre il segnale o fare analisi piu' alte.

## Setup del preprocessing

Conviene prevedere una fase di setup:
- misura della latenza
- verifica dell'allineamento output -> input
- taratura della sottrazione
- controllo dell'energia residua nelle pause

Questo serve a evitare che il sistema si confonda con quello che sta gia' suonando.

## Song di test: principio

I brani di test non devono essere solo file di prova.
Devono essere benchmark con verita' nota.

Ogni song di test dovrebbe avere:
- struttura temporale nota
- BPM noti
- pause note
- marker di sezione
- blocchi con funzione chiara
- metadata leggibili dal sistema

## Cosa devono misurare i song di test

Un buon song di test deve permettere di misurare:
- errore sul BPM
- velocita' di aggancio iniziale
- velocita' di riaggancio dopo un cambio
- falsi positivi nelle pause
- capacita' di tenere il beat `1`
- stabilita' della fase
- comportamento su frasi piu' lunghe

## Tipi di song di test

### 1. Song per il tempo

Scopo:
- verificare il BPM tracking
- verificare il re-lock

Esempi:
- blocchi a tempi noti
- cambi di BPM
- pause brevi o rumorose

### 2. Song per la fase

Scopo:
- verificare dove cade l'`1`
- verificare l'ordine dei quarti

Esempi:
- pattern molto regolari
- blocchi di battute ripetuti
- accenti forti all'inizio della battuta

### 3. Song per la struttura

Scopo:
- capire dove siamo in una frase o in una forma piu' lunga

Esempi:
- `16 grid`
- frasi da `4` battute
- blocchi ricorrenti
- sezioni da `6`, `7`, `2` se il segnale e' molto stabile

## Learning: due modalita'

### Imparare sapendolo

Serve una base supervisionata con verita' nota:
- BPM noti
- inizio sezione noto
- beat `1` noto
- struttura nota

Questo e' il bootstrap corretto.

### Imparare provando e chiedendo conferma

Poi serve il refinement con feedback utente:
- questa configurazione era buona?
- si e' corretto in fretta?
- era troppo invasivo?
- ha sbagliato il beat `1`?

Questa seconda parte permette di adattarsi ai casi reali.

## Cosa va imparato

Il sistema dovrebbe imparare almeno:
- soglie di detection
- pesi delle finestre
- tolleranze su beat `1`
- comportamento di resync
- quanto in fretta diventare musicalmente presente
- quali configurazioni funzionano meglio per certi pattern

## Configurazioni da valutare

Ogni configurazione significativa dovrebbe essere valutabile.

Valutazioni semplici:
- `scarso`
- `debole`
- `buono`
- `ottimo`

Andrebbero salvati:
- campione
- configurazione
- BPM dominante
- stabilita'
- readiness
- lock
- accuratezza beat `1`
- numero di resync
- rating
- nota utente

## Convergenza musicale

La convergenza deve seguire questa logica:

### Fase iniziale

- ascolto
- bassa invasivita'
- niente espansione prematura

### Fase intermedia

- supporto discreto
- piu' presenza ma ancora controllata

### Fase alta confidenza

- piu' intensita'
- piu' componenti
- piu' effetti

Ma solo se:
- il pattern e' riconoscibile
- il BPM e' stabile
- il lock e' solido
- il beat `1` non degrada

## Correzione rapida ma non sbilanciata

Il sistema deve:
- correggersi in fretta
- non partire troppo presto
- non inseguire il segnale in modo nervoso
- saper tagliare una battuta partita male
- poter ripartire da zero in sync con l'ascolto

## Quando usare una rete neurale

Una rete neurale puo' essere utile, ma va inserita come strato superiore.

Non dovrebbe sostituire subito:
- preprocessing
- BPM detection
- riallineamento di base

Puo' invece aiutare a:
- riconoscere pattern piu' complessi
- inferire struttura
- leggere indizi timbrici o armonici
- scegliere configurazioni migliori
- prevedere continuita' ritmica

## Punto pratico

L'architettura ideale e':

- strato 1: DSP/classico
- strato 2: learning supervisionato
- strato 3: feedback utente e valutazione configurazioni
- strato 4: eventuale modulo neurale
- strato 5: convergenza musicale adattiva

## Riassunto operativo

Le priorita' restano:

1. preprocessing e sottrazione dell'autosuonato
2. BPM tracking
3. re-lock veloce
4. fase e beat `1`
5. frase e struttura lunga
6. apprendimento su configurazioni
7. espansione musicale guidata dalla confidenza
