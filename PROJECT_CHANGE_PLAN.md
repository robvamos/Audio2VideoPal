# Piano di modifica del progetto

## Obiettivo
Correggere il frontend React in `VisualMusic` per far funzionare la scansione dei plugin e aggiungere un piano chiaro delle modifiche ai file di progetto.

## Modifiche previste

1. `VisualMusic/src/App.tsx`
   - Aggiungere la funzione `scanPlugins()` per invocare il comando Tauri `scan_plugins`.
   - Correggere il bug dell’uso di `scanPlugins()` in `Home` e `Plugins` senza una definizione.
   - Migliorare la gestione dei dettagli di scansione (`scanDetails`) parsando il JSON una sola volta.
   - Aggiornare lo stato dei plugin dopo la scansione per mostrare risultati freschi.

2. `PROJECT_CHANGE_PLAN.md`
   - Aggiungere questo piano di modifiche nel repository per tracciare i cambiamenti e mantenere trasparenza sul lavoro eseguito.

## Note tecniche

- Il backend Tauri espone già i comandi richiesti: `scan_plugins`, `get_plugins_list`, `deep_scan_plugin`, `get_plugin_deep_scan`.
- La modifica front-end garantisce che l’interfaccia utente abbia una funzione di scansione documentata e un comportamento coerente.

## Prossimi passi suggeriti

- Verificare il caricamento automatico dei plugin quando si passa alla scheda `Plugins`.
- Aggiungere una notifica di errore più leggibile per la scansione fallita.
- Integrare un indicatore di progresso separato per `scanPlugins` e `deepScanPlugin`.
