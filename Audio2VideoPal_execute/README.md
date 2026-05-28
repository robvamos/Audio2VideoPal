# Audio2VideoPal Execute

Questa cartella raccoglie in forma eseguibile e leggibile le intenzioni del modulo audio per il "musicista improvvisatore" di `Audio2VideoPal`.

Questa documentazione va letta come autonoma: non dipende dal progetto `DDassistant`, da `Doomsday` o da logiche specifiche di automazione gioco. Qui dentro il focus e' solo su audio, preprocessing, BPM, fase, learning e convergenza musicale.

L'obiettivo non e' solo riconoscere il tempo, ma costruire una pipeline che:
- ascolta in modo non invasivo
- si allinea rapidamente al ritmo
- poi impara la fase del brano e dove cade il beat `1`
- infine usa la propria confidenza per decidere quanto diventare musicalmente significativa

## Obiettivi del modulo

- preprocessing robusto per evitare che il sistema si confonda con il proprio output
- BPM detection e riallineamento ritmico rapido
- riconoscimento progressivo della fase e delle battute
- gestione di frasi piu' lunghe, come `16 grid` o blocchi da `4` battute
- apprendimento da ground truth nota e da conferma utente
- convergenza musicale inizialmente discreta, poi piu' presente solo quando la confidenza cresce davvero

## Documenti inclusi

- [ARCHITECTURE.md](F:/_CODEX/Audio2VideoPal/Audio2VideoPal_execute/ARCHITECTURE.md): schema architetturale ipotizzato
- [MODELS.md](F:/_CODEX/Audio2VideoPal/Audio2VideoPal_execute/MODELS.md): modelli concettuali da passare al progetto ospite senza imporre implementazione
- [LEARNING_SYSTEM.md](F:/_CODEX/Audio2VideoPal/Audio2VideoPal_execute/LEARNING_SYSTEM.md): logica di learning, feedback e valutazione configurazioni
- [SONG_TEST_AND_LEARNING_MODEL.md](F:/_CODEX/Audio2VideoPal/Audio2VideoPal_execute/SONG_TEST_AND_LEARNING_MODEL.md): dossier unico su song di test, setup, apprendimento e convergenza
- [TEST_LIBRARY.md](F:/_CODEX/Audio2VideoPal/Audio2VideoPal_execute/TEST_LIBRARY.md): libreria di brani di test e scopo dei preset
- [IMPLEMENTATION_ROADMAP.md](F:/_CODEX/Audio2VideoPal/Audio2VideoPal_execute/IMPLEMENTATION_ROADMAP.md): sequenza di lavoro consigliata
- [skills/studio-musica-jammerpal](F:/_CODEX/Audio2VideoPal/Audio2VideoPal_execute/skills/studio-musica-jammerpal): skill locale pronta da passare o riutilizzare nel progetto

## Priorita' attuale

1. preprocessing e soppressione del segnale autosuonato
2. BPM detecting e riallineamento rapido
3. fase del brano e riconoscimento del beat `1`
4. tracking di frasi piu' lunghe e sezioni stabili
5. presenza musicale adattiva guidata dalla confidenza
