# Elenco Storie MVP - Content Calendar

Questo documento raccoglie la suddivisione delle storie utente/funzionalità per l'implementazione incrementale dell'MVP.  
Tutte le 12 storie sono state **completate con successo**, con 40 unit test superati e la build standalone verificata.

---

## Story 01: Setup Progetto Electron, Vite, React & Tailwind [Completata]
- **Obiettivo:** Inizializzare la struttura del repository con il boilerplate base.
- **Attività principali:**
  - Setup di `electron-vite` con TypeScript.
  - Configurazione di React 18, Tailwind CSS e base di shadcn/ui.
  - Setup dei processi Main, Preload (con `contextBridge`) e Renderer.
- **Incremento Testabile:**  
  Avviando l'app in modalità sviluppo (`npm run dev`), si apre una finestra desktop con una schermata iniziale stilizzata con Tailwind e Hot Module Replacement (HMR) attivo.

---

## Story 02: Setup Database Locale SQLite & Drizzle ORM [Completata]
- **Obiettivo:** Predisporre il motore di persistenza locale nel Main Process.
- **Attività principali:**
  - Installazione e configurazione di SQLite (driver libSQL / Drizzle ORM) senza dipendenze da compilatori C++.
  - Definizione dello schema delle tabelle: `events`, `tags`, `event_tags`, `event_attachments`.
  - Migrazione automatica/inizializzazione del file `.sqlite` nel percorso dati dell'utente (`userData`).
- **Incremento Testabile:**  
  All'avvio dell'applicazione il database viene creato su disco con tutte le tabelle; suite di test unitari con Vitest e invocazione IPC confermano la lettura/scrittura dei record e il rispetto dei vincoli di foreign key con cancellazione a cascata.

---

## Story 03: Logica IPC & CRUD Tag (Backend & State) [Completata]
- **Obiettivo:** Implementare la gestione logica dei tag utente (creazione, lettura, modifica, cancellazione).
- **Attività principali:**
  - Creazione del repository e service dei Tag nel Main Process (`src/main/services/tag.service.ts`).
  - Esposizione dei canali IPC tipizzati (`tags:get-all`, `tags:get-by-id`, `tags:create`, `tags:update`, `tags:delete`).
  - Bridge tipizzato nel Preload e hook/store di stato nel Renderer (`useTags`).
- **Incremento Testabile:**  
  Suite di 12 test unitari dedicati in `tests/tags.test.ts` che verificano validazione, normalizzazione colore HEX, unicità dei nomi (case-insensitive) e operazioni CRUD su SQLite.

---

## Story 04: UI Gestione Tag [Completata]
- **Obiettivo:** Consentire all'utente di gestire visivamente i propri tag dall'interfaccia.
- **Attività principali:**
  - Componente badge per tag con colore dinamico (`TagBadge`).
  - Modale interattiva di gestione tag (`TagManagerModal`) con palette predefinita di 10 colori vivaci, color picker HEX nativo, form di creazione, modifica inline ed eliminazione con conferma.
  - Integrazione nell'header e nella dashboard principale (`App.tsx`) con contatore tag reattivo.
- **Incremento Testabile:**  
  L'utente apre la modale "Gestione Tag", crea nuovi tag con palette o codice esadecimale personalizzato, modifica nome/colore dei tag esistenti o li elimina; i tag vengono visualizzati come pillole colorate e persistono al riavvio.

---

## Story 05: Motore Matrice Calendario Headless & Vista Mensile UI [Completata]
- **Obiettivo:** Creare il motore di calcolo del calendario agnostico dalla UI e renderizzare la vista mensile.
- **Attività principali:**
  - **Headless Core (`src/core/calendar/`):**
    - Modulo puro TypeScript `CalendarGridEngine`: calcola la griglia dei 42 giorni (giorni del mese corrente + giorni cuscinetto del mese precedente e successivo), identifica oggi/weekend, e assegna gli eventi al rispettivo giorno (`assignEventsToDays`) con ordinamento (eventi "Tutto il giorno" prima, poi per ora).
    - Unit test completi su algoritmi di cambio mese, anni bisestili e assegnazione eventi ai giorni (`tests/calendarEngine.test.ts`).
  - **Presentation Layer (React):**
    - Componente puro `MonthCalendarView`: riceve la matrice di celle dal Core e la renderizza con CSS Grid.
    - Controlli temporali: pulsanti mese precedente/successivo, "Oggi" e visualizzazione "Mese Anno".
- **Incremento Testabile:**  
  Suite di test unitari sul Core matematico delle date superata al 100%; l'utente visualizza a schermo il mese corrente con i corretti giorni della settimana, naviga tra i mesi e torna alla data odierna con un clic.

---

## Story 06: Core Dominio Eventi, IPC & Modale Creazione Evento Semplice [Completata]
- **Obiettivo:** Implementare il modello di dominio degli eventi disaccoppiato e la creazione dell'evento semplice.
- **Attività principali:**
  - **Headless Core (`src/core/events/`):**
    - Classi di dominio `BaseEvent`, `SimpleEvent`, `EventFactory` e validatori di date/titoli (`tests/eventModels.test.ts`).
  - **Backend & IPC (`src/main/`):**
    - `EventService`: salvataggio nel database relazionale (`events`, `event_tags`) e query per intervallo temporale (`events:get-by-range`, `events:create`).
  - **Presentation Layer (React):**
    - Modale "Nuovo Evento" (`EventModal`) attivabile cliccando su qualsiasi giorno del calendario o tramite pulsante dedicato.
    - Form con titolo, descrizione, date inizio/fine, flag "Tutto il giorno" e selezione multi-tag.
    - Visualizzazione della card dell'evento con badge dei tag nella rispettiva cella del giorno.
- **Incremento Testabile:**  
  L'utente clicca su un giorno del calendario, compila il form di un evento semplice con uno o più tag e salva: l'evento viene salvato su SQLite e compare immediatamente nel giorno corrispondente del calendario.

---

## Story 07: Dettaglio, Modifica ed Eliminazione Evento (Core & UI) [Completata]
- **Obiettivo:** Gestire il ciclo di vita completo di modifica ed eliminazione degli eventi.
- **Attività principali:**
  - **Headless Core & Backend:**
    - Metodi `updateEvent` e `deleteEvent` con validazione di dominio e canali IPC (`events:update`, `events:delete`), con cancellazione a cascata.
  - **Presentation Layer (React):**
    - Click su qualsiasi card evento per aprire la modale di dettaglio/modifica pre-popolata.
    - Modifica in tempo reale dei campi e cancellazione con conferma.
- **Incremento Testabile:**  
  L'utente apre un evento dal calendario, ne aggiorna il titolo o i tag e vede il calendario aggiornarsi istantaneamente; eliminando l'evento, questo scompare dal calendario e dal database.

---

## Story 08: Modulo File System Nativo (Core Path Utilities & IPC) [Completata]
- **Obiettivo:** Fornire l'integrazione con il file system locale di Windows e macOS.
- **Attività principali:**
  - **Headless Core (`src/core/filesystem/`):**
    - Utility pure `normalizeCrossPlatformPath` e `extractFileMetadata` testate in `tests/pathUtils.test.ts`.
  - **Backend & IPC (`src/main/`):**
    - Canale `file:pick-files`: dialog nativo `dialog.showOpenDialog` per selezione multipla file locali.
    - Canale `file:reveal-in-folder`: comando nativo `shell.showItemInFolder` per aprire Finder o Explorer evidenziando il file.
- **Incremento Testabile:**  
  Invocazione del file picker nativo da interfaccia, selezione di file e apertura istantanea della cartella contenitore con il file evidenziato tramite Esplora Risorse o Finder.

---

## Story 09: Evento con Allegati Locali (Modello Polimorfico & UI) [Completata]
- **Obiettivo:** Integrare il supporto al secondo tipo di evento previsto dall'MVP (Evento con Allegati Locali).
- **Attività principali:**
  - **Headless Core (`src/core/events/`):**
    - Classe `LocalAttachmentEvent` che estende `BaseEvent` e incapsula la lista di `FileAttachment`.
  - **Backend & IPC (`src/main/`):**
    - Salvataggio e sincronizzazione relazionale degli allegati (`event_attachments`).
  - **Presentation Layer (React):**
    - Form evento con pulsante "+ Allega File Locale" (file picker nativo).
    - Lista allegati con estensione e pulsante "Mostra nella Cartella" per ciascun file.
    - Icona/badge graffetta visivo sulla card dell'evento nel calendario.
- **Incremento Testabile:**  
  L'utente crea un evento con allegati, associa file locali e salva; riaprendo l'evento dal calendario, clicca su "Mostra nella Cartella" accanto a un allegato e Finder/Explorer si apre evidenziando esattamente quel file.

---

## Story 10: Motore Filtri Tag (Headless Filter Engine & UI) [Completata]
- **Obiettivo:** Consentire il filtraggio reattivo degli eventi visualizzati nel calendario tramite tag.
- **Attività principali:**
  - **Headless Core (`src/core/filters/`):**
    - `EventFilterEngine`: funzione pura che filtra la lista di eventi in base ai tag attivi o ricerca testuale (`tests/eventFilterEngine.test.ts`).
  - **Presentation Layer (React):**
    - Barra superiore dei filtri con chip cliccabili dei tag.
    - Selezione multi-tag o reset rapido "Tutti".
- **Incremento Testabile:**  
  Selezionando uno o più tag nella barra filtri, la vista del calendario aggiorna istantaneamente gli eventi visibili in base ai criteri selezionati.

---

## Story 11: Vista Settimanale del Calendario (Core Engine & UI) [Completata]
- **Obiettivo:** Offrire la visualizzazione settimanale dettagliata a 7 colonne.
- **Attività principali:**
  - **Headless Core (`src/core/calendar/`):**
    - Metodo `buildWeekMatrix` in `CalendarGridEngine` per calcolare i 7 giorni della settimana corrente.
  - **Presentation Layer (React):**
    - Selettore di vista (Mese / Settimana) nella barra di navigazione.
    - Componente `WeekCalendarView` con navigazione settimana per settimana e interazione completa.
- **Incremento Testabile:**  
  L'utente passa dalla vista Mese alla vista Settimana, naviga tra le settimane e interagisce normalmente con gli eventi e i relativi allegati.

---

## Story 12: Build & Packaging Multipiattaforma (Windows & macOS) [Completata]
- **Obiettivo:** Configurare la build dell'applicazione per generare i pacchetti standalone eseguibili.
- **Attività principali:**
  - Configurazione script di packaging di Electron in `package.json` (`build:win`, `build:mac`, `pack`).
  - Generazione directory standalone eseguibile in `dist/win-unpacked/Content Calendar.exe` (188 MB) funzionante autonomamente.
- **Incremento Testabile:**  
  Esecuzione del comando di packaging con generazione con successo dell'eseguibile standalone senza ambiente di sviluppo attivo.
