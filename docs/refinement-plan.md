# Piano di Rifinitura e Semplificazione MVP

**Data:** 1 Novembre 2026  
**Stato:** Approvato / In corso di implementazione  

A seguito del primo ciclo di implementazione dell'MVP, vengono applicate le seguenti semplificazioni e correzioni per rendere il sistema minimale, robusto e focalizzato sull'uso reale come Content Calendar e scadenziario.

---

## 1. Rimozione della Visualizzazione "Mese"
- **Motivazione:** Focalizzare l'esperienza d'uso e il flusso di lavoro sulla vista settimanale ("Week View"), identificando i requisiti precisi prima di re-introdurre la vista mensile.
- **Interventi:**
  - Rimozione dello switcher Mese/Settimana nella barra superiore (`CalendarHeader`).
  - La visualizzazione fissa attiva è ora la **Settimana**.
  - Navigazione temporale (Precedente / Successivo) per passi di 1 settimana (`addWeeks` / `subWeeks`).
  - Il caricamento degli eventi interroga l'intervallo temporale della settimana corrente (da Lunedì a Domenica).

---

## 2. Semplificazione del Modello Evento (Scadenza Singola)
- **Motivazione:** Gli eventi nel Content Calendar rappresentano scadenze di pubblicazione o completamento contenuto, non eventi di calendario con orari di inizio/fine o fasce orarie complesse.
- **Interventi:**
  - **Campi rimossi:** `startDate`, `endDate`, `isAllDay`.
  - **Nuovo campo:** `date` (stringa in formato ISO `YYYY-MM-DD`).
  - **Database SQLite:** La colonna `date TEXT NOT NULL` sostituisce `start_date`, `end_date`, `is_all_day`. La routine di migrazione in `initDatabase` converte i dati preesistenti e rimuove le vecchie colonne con vincolo `NOT NULL` per prevenire errori di inserimento (`SQLITE_CONSTRAINT_NOTNULL`).
  - **Interfaccia Modale Evento:** La data dell'evento è implicita: corrisponde alla cella su cui l'utente ha cliccato nel calendario (o all'evento aperto in modifica). È stato quindi rimosso l'input manuale per selezionare la data, sostituendolo con un chiaro indicatore visivo nel titolo della modale (es. "Lunedì 2 Novembre 2026").
  - **Logiche di Dominio:** I controlli di validazione verificano la presenza di una data valida senza dover calcolare intervalli di inizio/fine. Nel motore calendario (`CalendarGridEngine`), l'assegnazione al giorno avviene per uguaglianza esatta (`event.date === isoDateString`).

---

## 3. Creazione e Applicazione dei Tag "Al Volo"
- **Motivazione:** Nella scheda di creazione/modifica evento, dover uscire per creare prima un tag nella gestione dedicata interrompe il flusso di lavoro.
- **Interventi:**
  - Nella modale evento (`EventModal`) è presente un campo di input testo per i tag.
  - Quando l'utente digita un nome tag e preme **Invio**:
    - Se il tag esiste già (confronto case-insensitive), viene selezionato/applicato all'evento.
    - Se il tag non esiste ancora, viene creato automaticamente nel database con un colore predefinito di default e immediatamente applicato all'evento.
  - Nessuna scelta del colore nella modale evento: la personalizzazione cromatica rimane delegata alla modale "Gestione Tag".
  - I tag selezionati possono essere rimossi con un clic sul chip; i tag disponibili non ancora selezionati rimangono visibili per una selezione rapida.

---

## 4. Aggiornamento Reattivo del Colore Badge Tag
- **Motivazione:** Modificando il colore di un tag nella gestione tag, i badge degli eventi già presenti nel calendario mantenevano il vecchio colore fino a un riavvio o ricaricamento forzato.
- **Interventi:**
  - In `App.tsx`, gli eventi aperti a schermo risolvono dinamicamente i propri tag tramite una mappa reattiva (`tagsMap`) derivata dallo stato globale `tags`.
  - Quando `updateTag` aggiorna il colore nel database e nello stato React, tutti i badge degli eventi associati si aggiornano istantaneamente in tutta l'interfaccia.
  - Al termine dell'aggiornamento o eliminazione di un tag viene inoltre invocato `reloadEvents()` per garantire la sincronizzazione a livello di persistenza.

---

## 5. Pulizia e Semplificazione Grafica della Header e della Vista Settimanale
- **Header unificata e pulita:**
  - Rimosso il numero della settimana ("Settimana X").
  - Rimossi titolo e sottotitolo dell'applicazione ("Content Calendar / Desktop Edition").
  - Spostata l'indicazione dell'intervallo date della settimana (es. "2 - 8 Novembre 2026") e i comandi di navigazione (`<`, `Oggi`, `>`) direttamente nell'intestazione principale a fianco dell'icona del calendario.
  - Rimossa la scatola di sfondo colorata dall'icona del calendario, mantenendo l'icona colorata di blu.
  - Rimosso il pulsante "+ Nuova Scadenza" dall'header: la creazione degli eventi avviene cliccando direttamente sulla colonna/giorno desiderato nel calendario.
- **Filtri Tag:**
  - Rimossa l'indicazione testuale "Filtra:" e l'icona a forma di filtro.
  - Rimosso il badge testuale "Tutti", sostituito con un'icona compatta per azzerare i filtri attivi (`FilterX`).
- **Caselle degli Eventi nel Calendario (Stile Card con Striscia d'Accento di Stato):**
  - Le card sono ora a sfondo **bianco puro (`bg-white`)** su un canvas settimanale delicato (`bg-slate-50/40`), con elevazione morbida (`shadow-2xs hover:shadow-md hover:-translate-y-0.5`).
  - **Stato "Fatto" (`isDone`) & Bordo d'Accento:**
    - È stato aggiunto il campo `isDone: boolean` nel modello e nel database SQLite (con valore di default `false`).
    - Quando un evento **non è fatto** (`isDone: false`), il bordo d'accento laterale è **Rosso** (`#EF4444`).
    - Quando un evento viene contrassegnato come **fatto** (`isDone: true`), il bordo d'accento laterale diventa **Verde** (`#10B981`) e il titolo viene delicatamente barrato/attenuato.
    - La modifica dello stato avviene direttamente dall'apposita proprietà nella scheda dell'evento (`EventModal`) o con **un solo clic immediato** dal nuovo drawer di lettura.

---

## 7. Pannello Inferiore Fisso di Ispezione Evento (Master-Detail Layout)
- **Architettura a Schermo Diviso (Master-Detail):**
  - Al posto di un drawer/overlay fluttuante che copriva parzialmente la griglia e richiedeva aperture/chiusure continue, la schermata adotta un layout desktop fisso:
    - **Parte superiore (Master):** Vista settimanale completa a 7 colonne.
    - **Parte inferiore (Detail):** Pannello fisso e permanente di ispezione ([`EventDetailsPanel.tsx`](file:///C:/Users/costa/Home/Opus/Content_Calendar/src/renderer/src/components/events/EventDetailsPanel.tsx)).
- **Comportamento & Interazioni:**
  - **Navigazione fluida a zero attrito:** Cliccando in sequenza sui diversi eventi del calendario, il pannello inferiore si aggiorna all'istante senza animazioni invasive.
  - **Evidenziazione visiva neutra della card attiva:** Eliminato qualsiasi bordo/anello colorato (es. blu) che creava confusione con i colori dei tag e dello stato. L'evento selezionato assume uno sfondo grigio neutro morbido (`bg-slate-100 border-slate-300 shadow-xs`), facendo risaltare la striscia d'accento laterale rossa o verde come unico e chiaro indicatore di stato.
  - **Barra superiore integrata & Layout verticale pulito:**
    - **Header bar superiore:** contiene il pulsante istantaneo di stato (*"Da fare"* / *"Fatto"*), il **titolo dell'evento** al centro, la pillola con la data formattata, e a destra i pulsanti per *Modifica* e *Deseleziona*.
    - **Area contenuti (Body):**
      1. Tag associati
      2. Descrizione / Note dell'evento (con altezza espansa)
      3. Allegati locali posizionati sotto alla descrizione, con apertura diretta della cartella di sistema.
  - **Modifica istantanea dello stato:** Il pulsante badge di stato in alto a sinistra permette di passare istantaneamente tra *"Da fare"* (rosso) e *"Fatto"* (verde) con **un solo clic**, aggiornando subito DB, pannello e card in alto.
  - **Apertura cartella allegati:** Le card degli allegati locali sono cliccabili ed evidenziano direttamente il file nel file manager di sistema (Explorer).
  - **Pulsante "Modifica":** Permette di aprire la modale completa `EventModal` per modifiche approfondite (titolo, data, tag, file).
  - **Stato vuoto elegante:** Quando nessun evento è selezionato (o cliccando su "Deseleziona" `X`), il pannello mostra un messaggio sobrio che invita a selezionare un evento o cliccare sulle colonne per crearne uno nuovo.
  - I badge interni dei tag conservano i propri colori ad alto contrasto e massima leggibilità sul fondo bianco.

---

## 6. Semplificazione Scheda Evento in stile "Notion / Document"
- **Header minimalista:**
  - Rimosso il riquadro icona ingombrante e il sottotitolo esplicativo.
  - Sostituito con un'intestazione discreta e pulita con indicatore di contesto (*"Nuovo Evento"* / *"Modifica Evento"*) e pulsante di chiusura `X`.
- **Hero Title prominente:**
  - Il titolo dell'evento è diventato l'elemento centrale: testo grande (`text-xl font-bold tracking-tight`), borderless e con autofocus all'apertura della modale.
- **Tabella Proprietà integrata (Data & Tag):**
  - **Data:** riga chiave-valore con icona, etichetta chiara e badge con la data completa formattata.
  - **Tag:** unificati su un'unica riga orizzontale. I tag selezionati sono chip compatti con pulsante `×` di rimozione; accanto è presente un campo inline tratteggiato (`+ Altro tag...`) per digitare e premere Invio per creare/applicare; i tag disponibili non ancora associati appaiono subito sotto come pillole ghost discrete (senza label ridondanti).
- **Area Note / Descrizione canvas:**
  - Textarea con sfondo e bordo morbidi, pensata per prendere appunti, inserire scalette o descrizioni in modo naturale.
- **Allegati Locali intelligenti e leggeri:**
  - **A stato vuoto:** rimosso il grande box grigio e il contatore "0"; sostituito con un pulsante compatto e discreto tratteggiato (*"+ Allega file dal computer"*).
---

## 8. Scorciatoie per i Titoli degli Eventi (Titoli Rapidi / Preset)
- **Posizionamento (Quick Chips):**
  - All'interno di [`EventModal.tsx`](file:///C:/Users/costa/Home/Opus/Content_Calendar/src/renderer/src/components/events/EventModal.tsx), subito sotto al campo input del titolo in stile Notion, è posizionata una barra di chip interattivi.
- **Inizializzazione Intelligente (Zero Presets Casuali):**
  - Nessun preset fittizio/casuale preimpostato (`DEFAULT_TITLE_PRESETS = []`).
  - Al primo avvio, l'applicazione controlla gli eventi già presenti nel calendario: se ci sono eventi, estrae automaticamente i titoli unici come preset iniziali; se il calendario è vuoto, parte senza alcun preset (`[]`).
  - **Nessun limite al numero di titoli:** l'utente può salvare tutti i preset che desidera.
- **Interazioni e Funzionalità:**
  - **1-Click Populate:** Cliccando su un chip, il titolo dell'evento viene popolato all'istante mantenendo il focus sull'input per eventuali aggiunte.
  - **Aggiunta manuale rapida (`+ Nuovo` / `+ Aggiungi titolo rapido`):** È possibile inserire un nuovo titolo direttamente tramite il pulsante inline premendo Invio.
  - **Salvataggio con 1 clic da testo digitato:** Se l'utente digita un titolo personalizzato non presente nei preset, appare un suggerimento discreto *"Salva '{titolo}' nei rapidi"* per memorizzarlo con un solo clic.
  - **Eliminazione al passaggio del mouse (`×`):** Passando il mouse su un chip appare un pulsante di eliminazione per rimuoverlo dalla lista.
  - **Persistenza locale:** Gestito tramite l'hook dedicato [`useTitlePresets.ts`](file:///C:/Users/costa/Home/Opus/Content_Calendar/src/renderer/src/hooks/useTitlePresets.ts) con salvataggio persistente su `localStorage`.

---

## 9. Gestione Copie Locali Autonome degli Allegati & Retention Policy (Step 1 - Proposta A)
- **Organizzazione cartelle per Data (`attachments/YYYY-MM/evento_<id>/`):**
  - All'atto del salvataggio di un evento con allegati, i file sorgente vengono copiati in una cartella locale gestita autonomamente dal software:
    `appData/attachments/YYYY-MM/evento_<id>/nome_file.ext`.
  - Risoluzione automatica di eventuali collisioni con suffisso numerico progressivo (`(1)`).
  - Nessuna duplicazione se il file risiede già nella cartella gestita.
- **Apertura Copia Locale Gestita:**
  - Cliccando su qualsiasi allegato (dalla modale o dal pannello inferiore), il software apre il file manager di sistema (Explorer/Finder) evidenziando la **copia locale gestita** all'interno della cartella specifica dell'evento.
- **Sincronizzazione & Pulizia Automatica:**
  - Se un allegato viene rimosso da un evento, la copia su disco viene eliminata in modo sicuro (soltanto se situata all'interno della directory gestita).
  - Se un evento viene eliminato, la cartella dell'evento `evento_<id>` e le relative sottocartelle vuote vengono rimosse dal disco.
- **Motore di Retention Policy:**
  - Configurazione salvata nel database SQLite (`app_settings`):
    - Periodo: *Mai (Conserva per sempre)*, *30 giorni*, *60 giorni*, *90 giorni*.
    - Filtro: *Solo eventi 'Fatti'* (default abilitato).
  - All'avvio dell'applicazione (o tramite il pulsante manuale *"Pulisci adesso"*), i file degli eventi scaduti vengono rimossi dal disco e i record nel DB vengono aggiornati.
- **Interfaccia Modalità Retention ([`RetentionModal.tsx`](file:///C:/Users/costa/Home/Opus/Content_Calendar/src/renderer/src/components/settings/RetentionModal.tsx)):**
  - Accessibile dal pulsante *"Allegati"* nell'header della vista calendario.
  - Mostra il riepilogo dello spazio disco occupato, il percorso della cartella con pulsante rapido *"Apri cartella"*, la selezione della retention e il pulsante per eseguire la pulizia su richiesta con feedback immediato sui byte e file liberati.
