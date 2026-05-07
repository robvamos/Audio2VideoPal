# Prompt iniziale per Codex

Devi impostare il progetto `Visual Music`, una app desktop per Windows 11 che genera visualizzazioni grafiche dinamiche da microfono o file audio e può esportare video compressi.

Leggi prima questi file:

1. `docs/00_overview.md`
2. `docs/01_architecture.md`
3. `docs/02_functional_spec.md`
4. `docs/03_winamp_plugin_integration.md`
5. `docs/04_codecs_tools.md`
6. `docs/05_frontend_recommendations.md`
7. `database/schema.sql`
8. `configs/project_config.json`
9. tutte le skill in `skills/*/SKILL.md`

Vincoli non negoziabili:

- L'export video deve essere abilitato prima dello Start.
- Durante una sessione le impostazioni export sono bloccate.
- Le DLL Winamp non devono essere caricate nel processo principale.
- I plugin Winamp legacy devono passare da helper separato, preferibilmente x86.
- Tutti i plugin, test, crash, sessioni, export, codec e metriche devono essere tracciati in SQLite.
- La preview deve essere disattivabile per modalità headless/batch.
- Il render da file audio deve poter essere offline e senza perdita frame.
- Il backend primario per codec/muxing è FFmpeg.

Prima milestone richiesta:

- crea skeleton progetto;
- crea database SQLite con schema;
- implementa detection FFmpeg/ffprobe;
- implementa UI base con modalità input, export settings e job log;
- implementa batch render fittizio/test pattern da file audio con export video;
- nessuna DLL Winamp caricata nella prima milestone.
