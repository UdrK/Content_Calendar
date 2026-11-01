# Architettura Tecnica - Content Calendar Desktop App

**Versione:** 1.2  
**Data:** 1 Novembre 2026  
**Stato:** Approvato / Specifiche Architetturali  
**Piattaforme Target:** Windows (10/11) & macOS (Intel / Apple Silicon)

---

## 1. Panoramica del Sistema & Separazione delle Responsabilità

L'applicazione adotta una rigorosa **Clean Architecture (Headless Domain)** per disaccoppiare totalmente la logica di business e la manipolazione dei dati dall'interfaccia grafica. 

In questo modo, la logica di calcolo del calendario (calcolo dei giorni, assegnazione degli eventi alle date, filtraggio per tag, estrazione metadati allegati) è **completamente agnostica rispetto alla UI**: se in futuro si volesse sostituire React con Vue, Svelte o un'altra tecnologia, l'intero motore di dominio (`src/core/`) rimarrebbe invariato e riutilizzabile al 100%.

```mermaid
flowchart TD
    subgraph UI_Layer ["1. Presentation Layer (Interfaccia Grafica - Sostituibile)"]
        ReactViews["React Views & Components (CalendarGrid, Modals, Badges)"]
        UIState["UI Hooks & Store (useCalendar, useTags)"]
    end

    subgraph Core_Layer ["2. Headless Domain Core (Pure TypeScript - Framework Agnostic)"]
        CalendarEngine["CalendarEngine (Calcolo matrice giorni, assegnazione eventi alle date)"]
        FilterEngine["EventFilterEngine (Filtraggio puro per tag e ricerca)"]
        EventModels["Event Domain Models (BaseEvent, SimpleEvent, LocalAttachmentEvent)"]
        EventFactory["EventFactory & Validators"]
    end

    subgraph IPC_Bridge ["3. IPC Gateway & Contracts"]
        PreloadBridge["Preload contextBridge (window.api)"]
        IPCRouter["Main Process IPC Handlers"]
    end

    subgraph Data_Layer ["4. Persistence & OS Services (Node.js Main Process)"]
        DBService["Database Services (SQLite + Drizzle ORM)"]
        FileService["File System & Shell Service (Finder/Explorer)"]
    end

    %% Relazioni tra i layer
    ReactViews --> UIState
    UIState --> Core_Layer
    UIState --> PreloadBridge
    Core_Layer -.->|Zero dipendenze da React/DOM| Core_Layer
    PreloadBridge <--> IPCRouter
    IPCRouter --> DBService
    IPCRouter --> FileService
```

### I 4 Livelli Architetturali:

1. **Presentation Layer (`src/renderer/src/components/`):**
   - Componenti puramente visivi (React + Tailwind CSS).
   - Ricevono strutture dati già pronte dal Core di dominio e si limitano a renderizzarle.
   - Non contengono algoritmi di calendario né logica di aggregazione date.

2. **Headless Domain Core (`src/core/`):**
   - **Zero dipendenze da React, JSX, Electron o DOM.**
   - Scritto in TypeScript puro, testabile al 100% con test unitari velocissimi in Vitest.
   - Contiene:
     - `CalendarEngine`: genera la matrice di giorni del mese e della settimana, assegna gli eventi al rispettivo slot temporale/giorno, gestisce gli ordinamenti (eventi "Tutto il giorno" prima, poi per orario).
     - `EventFilterEngine`: applica i filtri per tag agli eventi senza toccare la UI.
     - `EventModels` & `EventFactory`: validazione, deserializzazione e manipolazione delle entità evento e allegati.

3. **IPC Gateway & Contracts (`src/preload/`, `src/shared/types.ts`):**
   - Canali di comunicazione e tipi strettamente tipizzati per trasferire i dati tra processo Renderer e Main.

4. **Persistence & OS Layer (`src/main/`):**
   - Database SQLite locale con Drizzle ORM.
   - Servizi nativi del sistema operativo (`dialog.showOpenDialog`, `shell.showItemInFolder`).

---

## 2. Stack Tecnologico

### 2.1 Runtime & Build Tooling
- **Electron:** Runtime desktop multipiattaforma.
- **TypeScript:** Tipizzazione end-to-end condivisa tra Main, Preload, Core e Renderer.
- **`electron-vite`:** Build tool basato su Vite con Hot Module Replacement (HMR).

### 2.2 Frontend & UI System (Presentation)
- **Framework UI:** **React** (versione 18+) con TypeScript.
- **Styling:** **Tailwind CSS**, per un design system snello e manutenibile.
- **Libreria Componenti:** **shadcn/ui (primitive Radix UI)**, componenti accessibili e personalizzabili.
- **Icone:** **Lucide React**.

### 2.3 Motore di Dominio del Calendario (Headless Core)
- **`src/core/calendar/` (Pure TypeScript + `date-fns`):**
  - Motore di calcolo date completamente separato dalla UI.
  - Funzioni pure che prendono in input un intervallo di date e una lista di `EventRecord` e restituiscono una matrice strutturata `CalendarMonthMatrix` o `CalendarWeekMatrix`.
  - Ogni cella contiene la data normalizzata, i flag di contesto (`isCurrentMonth`, `isToday`, `isWeekend`) e la lista degli eventi assegnati a quel giorno già ordinati.

### 2.4 Persistenza Dati (Database Locale)
- **Database Engine:** **SQLite** tramite il driver nativo precompilato ad alte prestazioni **`@libsql/client`**.
- **ORM / Query Builder:** **Drizzle ORM** (type-safe, migrazioni automatiche).
- **Archiviazione:** File di database `.sqlite` salvato in `app.getPath('userData')`.
- **Integrità:** Transazioni ACID, foreign keys attive e cancellazioni a cascata (`ON DELETE CASCADE`).

### 2.5 Integrazione col File System Locale
- `shell.showItemInFolder(fullFilePath)`: Funzione nativa di Electron per aprire Finder (macOS) o Explorer (Windows) evidenziando il file.
- `dialog.showOpenDialog(...)`: Finestra di selezione file nativa del sistema operativo.
- `node:fs/promises` & `node:path`: Normalizzazione dei percorsi e verifica dell'esistenza fisica dei file.

---

## 3. Architettura delle Classi & Pattern di Estensibilità

```mermaid
classDiagram
    namespace Core_Domain {
        class CalendarGridEngine {
            +buildMonthMatrix(year: number, month: number, events: BaseEvent[]) CalendarMonthGrid
            +buildWeekMatrix(date: Date, events: BaseEvent[]) CalendarWeekGrid
            -assignEventsToDays(days: CalendarDay[], events: BaseEvent[]) void
            -sortDayEvents(events: BaseEvent[]) BaseEvent[]
        }

        class EventFilterEngine {
            +filterByTags(events: BaseEvent[], activeTagIds: string[]) BaseEvent[]
            +filterBySearch(events: BaseEvent[], query: string) BaseEvent[]
        }

        class BaseEvent {
            <<abstract>>
            +string id
            +string title
            +EventType type
            +Date startDate
            +Date? endDate
            +boolean isAllDay
            +string[] tagIds
            +Date createdAt
            +Date updatedAt
            +validate() boolean*
            +isMultiDay() boolean
        }

        class SimpleEvent {
            +string? description
            +validate() boolean
        }

        class LocalAttachmentEvent {
            +string? description
            +FileAttachment[] attachments
            +validate() boolean
            +getAttachmentPaths() string[]
            +hasAttachments() boolean
        }

        class FileAttachment {
            +string id
            +string filePath
            +string fileName
            +string fileExtension
            +number? fileSizeBytes
            +Date addedAt
        }

        class Tag {
            +string id
            +string name
            +string colorHex
        }

        class EventFactory {
            +createFromRecord(record: EventRecord, tags: TagRecord[], attachments: AttachmentRecord[]) BaseEvent
            +createNew(type: EventType, params: any) BaseEvent
        }
    }

    BaseEvent <|-- SimpleEvent
    BaseEvent <|-- LocalAttachmentEvent
    LocalAttachmentEvent "1" *-- "many" FileAttachment
    BaseEvent "many" o-- "many" Tag
    EventFactory ..> BaseEvent : creates
    CalendarGridEngine ..> BaseEvent : groups into days
    EventFilterEngine ..> BaseEvent : filters
```

---

## 4. Flusso dei Dati e Contratti IPC (Sequence Diagram)

### Scenario: Calcolo e Rendering del Calendario
```mermaid
sequenceDiagram
    autonumber
    actor User as Utente
    participant UI as React Calendar Component
    participant Hook as useCalendar Hook
    participant Bridge as Preload (window.api)
    participant IPC as Main Process
    participant DB as SQLite Database
    participant Core as Core Domain (CalendarGridEngine)

    User->>UI: Apre vista mese (es. Novembre 2026)
    UI->>Hook: loadMonth(2026, 11)
    Hook->>Bridge: window.api.events.getByRange(start, end)
    Bridge->>IPC: ipcRenderer.invoke('events:get-by-range', ...)
    IPC->>DB: Query Drizzle ORM (events + tags + attachments)
    DB-->>IPC: Raw Records
    IPC-->>Bridge: EventWithDetails[]
    Bridge-->>Hook: EventWithDetails[]
    
    Note over Hook,Core: La UI non calcola le date a mano: delega al Core Headless
    Hook->>Core: CalendarGridEngine.buildMonthMatrix(2026, 11, events)
    Core-->>Hook: CalendarMonthGrid (42 giorni con eventi già associati e ordinati)
    Hook-->>UI: State update con matrice pronta
    UI->>User: Visualizza griglia calendario
```

---

## 5. Schema Dati Relazionale (SQLite con Drizzle ORM)

### Tabella `events`
| Campo | Tipo | Note |
|---|---|---|
| `id` | TEXT PRIMARY KEY | UUIDv4 |
| `type` | TEXT NOT NULL | `'simple'` \| `'attachment'` \| *futuri tipi* |
| `title` | TEXT NOT NULL | Titolo dell'evento |
| `description` | TEXT | Testo / Note |
| `start_date` | TEXT NOT NULL | ISO 8601 string |
| `end_date` | TEXT | ISO 8601 string |
| `is_all_day` | INTEGER NOT NULL | 0 = false, 1 = true |
| `metadata` | TEXT | JSON serializzato per attributi futuri |
| `created_at` | TEXT NOT NULL | ISO 8601 string |
| `updated_at` | TEXT NOT NULL | ISO 8601 string |

### Tabella `tags`
| Campo | Tipo | Note |
|---|---|---|
| `id` | TEXT PRIMARY KEY | UUIDv4 |
| `name` | TEXT NOT NULL UNIQUE | Nome univoco del tag |
| `color_hex` | TEXT NOT NULL | Codice colore esadecimale (es. `#3B82F6`) |

### Tabella `event_tags` (Many-to-Many)
| Campo | Tipo | Note |
|---|---|---|
| `event_id` | TEXT NOT NULL | Foreign Key → `events(id)` ON DELETE CASCADE |
| `tag_id` | TEXT NOT NULL | Foreign Key → `tags(id)` ON DELETE CASCADE |
| *PRIMARY KEY* | `(event_id, tag_id)` | Chiave primaria composta |

### Tabella `event_attachments` (One-to-Many)
| Campo | Tipo | Note |
|---|---|---|
| `id` | TEXT PRIMARY KEY | UUIDv4 |
| `event_id` | TEXT NOT NULL | Foreign Key → `events(id)` ON DELETE CASCADE |
| `file_path` | TEXT NOT NULL | Percorso assoluto del file locale |
| `file_name` | TEXT NOT NULL | Nome originale del file con estensione |
| `file_extension` | TEXT NOT NULL | Estensione normalizzata (es. `.mp4`, `.pdf`) |
| `added_at` | TEXT NOT NULL | ISO 8601 string |

---

## 6. Considerazioni Cross-Platform e Specifiche macOS

1. **Azione "Mostra nella Cartella" (`shell.showItemInFolder`):**  
   Su macOS invia il comando nativo Cocoa al Finder (`NSWorkspace activateFileViewerSelectingURLs:`), il quale gestisce la visualizzazione senza richiedere permessi speciali all'applicazione.
2. **Selezione File (`dialog.showOpenDialog`):**  
   La selezione volontaria dell'utente tramite file picker nativo conferisce autorizzazione esplicita (*user intent*).
3. **Normalizzazione Percorsi:**  
   Il modulo `src/core/` normalizza sempre i separatori (`/` su macOS e `\` su Windows) prima di qualsiasi persistenza o chiamata di sistema.
4. **Scorciatoie da tastiera:**  
   Supporto trasparente a `Cmd` su macOS e `Ctrl` su Windows.
