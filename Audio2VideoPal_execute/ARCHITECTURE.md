# Architecture

## Intento generale

Il modulo audio deve comportarsi come un improvvisatore assistito:
- inizialmente ascolta
- cerca pattern riconoscibili
- si allinea senza essere invasivo
- poi, solo quando e' sufficientemente sicuro, aumenta presenza, componenti ed effetti

## Pipeline ipotizzata

```text
Ingresso audio / microfono
    ->
Riferimento del segnale autosuonato
    ->
Preprocessing
    - latenza stimata
    - cancellazione / sottrazione del proprio output
    - envelope / onset extraction
    ->
BPM detection a finestre
    - finestre brevi
    - merge in segmenti stabili
    ->
Learning grid
    - battute attese
    - peso diverso per beat 1
    - finestre di tolleranza
    ->
Tracking learning
    - osservazioni
    - fast/slow correction
    - reset sync / cut bar
    ->
Convergence profile
    - quanto essere discreto o presente
    - intensita'
    - complessita' componenti
    - effetti
    ->
Output musicale / visuale
```

## Strati logici consigliati

### 1. Preprocessing layer

Responsabilita':
- pulizia del segnale in ingresso
- rimozione o riduzione dell'autosuonato
- misura della latenza
- estrazione onset, envelope ed energia

Questo e' il punto giusto in cui sottrarre il segnale di riferimento, prima di qualsiasi scomposizione o analisi piu' costosa.

### 2. Tempo alignment layer

Responsabilita':
- BPM detection
- lettura di finestre stabili
- merge di blocchi coerenti
- riallineamento rapido dopo transizioni

Questo strato deve essere veloce, spiegabile e robusto anche senza AI.

### 3. Phase learning layer

Responsabilita':
- riconoscere dove cade il beat `1`
- capire l'ordine dei quarti
- usare finestre con peso diverso
- decidere quando una battuta va tagliata e il sync va fatto ripartire

### 4. Phrase / structure layer

Responsabilita':
- capire dove siamo in blocchi lunghi
- gestire `16 grid`, frasi di `4` battute, sezioni da `6`, `7`, `2` o altre se il segnale e' stabile
- usare anche eventuali indizi di timbro o tonalita'

### 5. Adaptive musical response layer

Responsabilita':
- dosare volume, componenti ed effetti
- partire discreto
- diventare significativo solo quando la convergenza e' forte

## Principi chiave

- la convergenza musicale deve essere rapida ma inizialmente non invasiva
- il sistema deve correggersi senza sbilanciarsi
- una lettura stabile del tempo vale piu' di un comportamento appariscente
- l'output deve crescere di presenza solo se la confidenza e' supportata da dati reali
