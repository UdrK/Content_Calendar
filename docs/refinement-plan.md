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
- **Caselle degli Eventi nel Calendario:**
  - Aspetto cromatico neutro (sfondo grigio chiaro `bg-slate-100/90` con bordo `border-slate-200`), slegato dal colore del tag per una lettura più pulita e ordinata.
  - I badge dei tag all'interno delle caselle evento conservano i propri colori distintivi.

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
  - **Con file presenti:** lista pulita dei file con card cliccabile per aprire la cartella di sistema ed evidenziare il file (con gestione del troncamento del nome ed esclusione di overflow) e pulsante di rimozione separato.
