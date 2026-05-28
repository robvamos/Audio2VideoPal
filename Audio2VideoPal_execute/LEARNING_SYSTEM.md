# Learning System

## Due modi di imparare

Il sistema dovrebbe imparare in due fasi complementari.

### 1. Imparare sapendolo

Usa campioni con verita' nota:
- BPM noto
- pause note
- blocchi fraseologici noti
- battute e beat `1` attesi

Questo serve a costruire una base affidabile per:
- tempo
- allineamento
- correzione
- fase

### 2. Imparare provando e chiedendo conferma

Usa feedback utente su configurazioni reali:
- la configurazione proposta era buona?
- il sistema si e' allineato in fretta?
- era troppo invadente?
- ha sbagliato l'inizio battuta?

Questo serve a migliorare:
- soglie
- pesi
- comportamento di convergenza
- intensita' dell'output

## Cosa va salvato

Per ogni sessione o prova utile:
- campione usato
- configurazione della pipeline
- BPM dominante
- stabilita' del pattern
- readiness di correzione
- lock raggiunto
- accuratezza del beat `1`
- numero di resync
- giudizio utente
- nota breve

## Valutazione della configurazione

Ogni configurazione significativa dovrebbe proporre una valutazione esplicita:
- `scarso`
- `debole`
- `buono`
- `ottimo`

Lo storico serve a capire:
- quali configurazioni funzionano meglio
- quando conviene restare discreti
- quando il sistema puo' aumentare intensita' o complessita'

## Rete neurale: quando ha senso

Una rete neurale puo' essere utile, ma non come primo stadio.

Prima devono essere solidi:
- preprocessing
- BPM detection
- allineamento rapido
- fase base

Poi un modello learned puo' aiutare a:
- riconoscere strutture di brano
- prevedere continuita' ritmica
- usare cambi timbrici o armonici come indizi
- pesare meglio le configurazioni

## Regola di convergenza musicale

Il sistema dovrebbe:
- iniziare ascoltando e restando discreto
- diventare piu' presente solo se pattern, BPM e lock restano forti
- evitare di diventare "musicalmente importante" troppo presto
