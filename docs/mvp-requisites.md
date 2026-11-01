# Requisiti di Progetto - MVP Content Calendar

**Versione:** 1.0  
**Data:** 1 Novembre 2026  
**Stato:** Bozza Iniziale (Draft)  
**Piattaforme Target:** Windows (10/11) & macOS (Intel / Apple Silicon)

---

## 1. Visione del Prodotto

Il progetto **Content Calendar** è un'applicazione desktop snella, offline-first e multipiattaforma, progettata per offrire un'esperienza di pianificazione del calendario arricchita con capacità di categorizzazione avanzata (tagging) e integrazione leggera con il file system locale.

A differenza dei tradizionali calendari cloud (Google Calendar, Outlook), l'applicazione mette al centro i file e i contenuti memorizzati sul computer dell'utente: permette di associare a ogni evento file locali di qualunque formato e di accedere istantaneamente alla cartella contenitore del file con un solo clic.

---

## 2. Piattaforme e Vincoli Tecnologici

- **Ambiente:** Applicazione Desktop basata su **Electron**.
- **Sistemi Operativi:** 
  - Windows (x64 / arm64)
  - macOS (Apple Silicon M-series & Intel x64)
- **Modalità di Esecuzione:** Completamente locale (offline-first), senza dipendenze obbligatorie da servizi cloud o account di terze parti per l'MVP.
- **Sicurezza:** Aderenza alle best practice di sicurezza Electron (`contextIsolation: true`, `nodeIntegration: false`, canali IPC tipizzati e validati tramite `preload`).

---

## 3. Requisiti Funzionali (Functional Requirements)

### 3.1 Gestione del Calendario (Core Calendar)
- **FR-1.1 Visualizzazione Temporale:**
  - Vista Mensile (principale per la visione d'insieme del piano editoriale/contenuti).
  - Vista Settimanale / Giornaliera per il dettaglio temporale.
  - Navigazione temporale fluida (mese precedente/successivo, "Oggi", selezione rapida data).
- **FR-1.2 Creazione e Modifica Evento:**
  - Possibilità di creare un evento cliccando su una data/orario o tramite pulsante dedicato "Nuovo Evento".
  - Modifica rapida (click o doppio click su evento per aprire la modale/pannello di dettaglio).
  - Eliminazione evento con conferma.
  - Possibilità (opzionale MVP) di trascinare un evento (drag & drop) per cambiare giorno/orario.

---

### 3.2 Tipi di Evento & Polimorfismo
Il sistema deve supportare diversi tipi di evento, con una struttura facilmente estendibile per aggiungerne di nuovi in futuro.

#### Tipo 1: Evento Semplice (Simple Event)
- **Campi obbligatori:** Titolo, Data di inizio.
- **Campi opzionali:** Ora di inizio/fine (o flag "Tutto il giorno"), Descrizione / Note testuali (con supporto a testo formattato o Markdown leggero), Tag associati.

#### Tipo 2: Evento con Allegati Locali (Local Attachment Event)
- Include tutti i campi dell'**Evento Semplice**.
- **Allegati Locali:**
  - Possibilità di aggiungere uno o più file locali all'evento.
  - I file possono essere di qualsiasi estensione (`.mp4`, `.psd`, `.docx`, `.fig`, `.zip`, `.pdf`, `.png`, ecc.).
  - Memorizzazione del percorso assoluto del file (e metadati di base: nome file, estensione, dimensione approssimativa, data associazione).
  - **Azione "Mostra nella Cartella":** In corrispondenza di ciascun allegato, l'utente dispone di un pulsante per aprire direttamente la cartella contenitore del file nel file manager di sistema (Esplora Risorse su Windows, Finder su macOS), evidenziando il file selezionato (`shell.showItemInFolder`).
  - **Gestione File Mancanti:** Se un file allegato viene spostato o cancellato dal disco, l'interfaccia deve segnalarlo con un badge/avviso chiaro (es. "File non trovato al percorso indicato") senza bloccare l'evento.

---

### 3.3 Sistema di Tag Utente (User-Defined Tagging)
- **FR-3.1 Creazione & Gestione Tag:**
  - L'utente può creare tag personalizzati specificando:
    - **Nome tag** (es. *Blog Post*, *Video YouTube*, *Newsletter*, *Draft*, *Urgente*).
    - **Colore identificativo** (palette predefinita + color picker HEX).
  - Modifica e cancellazione tag (con gestione degli eventi già associati).
- **FR-3.2 Assegnazione Tag agli Eventi:**
  - Possibilità di associare uno o più tag a qualsiasi tipo di evento (sia Eventi Semplici sia Eventi con Allegati).
  - Selezione rapida dei tag tramite chip / pill selector con autocompletamento.
- **FR-3.3 Filtri e Visualizzazione:**
  - Badge colorati dei tag visibili direttamente sul blocco dell'evento nel calendario.
  - Barra filtri rapida per isolare la visualizzazione di eventi appartenenti a specifici tag.

---

### 3.4 Interazione col File System Locale
- **FR-4.1 File Picker Nativo:**
  - Integrazione con la finestra di dialogo nativa del sistema operativo (`dialog.showOpenDialog`) per selezionare uno o più file da allegare all'evento.
  - Supporto al Drag & Drop di file direttamente dalla finestra dell'OS alla modale dell'evento.
- **FR-4.2 Apertura Cartella Contenitore:**
  - Interazione diretta con il desktop environment tramite le API native di Electron (`shell.showItemInFolder`).

---

### 3.5 Persistenza Dati Locale
- **FR-5.1 Database Locale:**
  - Salvataggio persistente e reattivo di tutti gli eventi, tipi di evento, tag e percorsi degli allegati.
  - Nessuna perdita di dati alla chiusura dell'app.
- **FR-5.2 Struttura Dati Relazionale:**
  - Relazione Many-to-Many tra Eventi e Tag.
  - Relazione One-to-Many tra Evento con Allegati e File Allegati.

---

## 4. Requisiti Non Funzionali (NFR)

| Categoria | Requisito | Descrizione |
|---|---|---|
| **Prestazioni** | Avvio e Reattività | Tempo di avvio inferiore a 2 secondi su hardware moderno; transizioni fluide fra i mesi e apertura istantanea dei dettagli evento. |
| **Portabilità** | Cross-Platform Parity | Esperienza d'uso identica e coerente sia su Windows che su macOS, rispettando le convenzioni native di ogni OS (es. scorciatoie Ctrl vs Cmd). |
| **Affidabilità** | Graceful Degradation | Se un file allegato non è più reperibile sul disco locale, l'applicazione non deve andare in crash ma mostrare uno stato di warning informativo. |
| **Sicurezza** | Sandbox & Isolation | Il processo Renderer non ha accesso diretto a `node:fs` né al comando shell; tutte le operazioni I/O transitano attraverso IPC controllate e validate. |
| **Estensibilità** | Architettura Modulare | Il codice deve essere strutturato per consentire l'aggiunta di nuovi tipi di evento (es. Checklist, Reminder, Post Social con canali specifici) senza riscrivere la logica esistente. |

---

## 5. Scope dell'MVP ed Esclusioni Future

### Incluso nell'MVP:
- Calendario con viste Mensile e Settimanale.
- Gestione Evento Semplice ed Evento con Allegati.
- Sistema di Tag personalizzati con colori e filtri.
- Selezione file con file picker nativo e azione "Mostra nella Cartella" (Explorer/Finder).
- Persistenza locale dei dati (offline-first).
- Build e pacchettizzazione per Windows (`.exe` / portable / installer) e macOS (`.dmg` / `.app`).

### Escluso dall'MVP (Post-MVP / Roadmap Futura):
- Sincronizzazione cloud (Google Calendar / iCloud / CalDAV).
- Pubblicazione automatica o diretta verso social media / piattaforme terze.
- Account utente / autenticazione multi-utente.
- Notifiche push di sistema per promemoria scadenza.
- Anteprima in-app di file pesanti (es. video player integrato, visualizzatore PSD).
