# CLAUDE.md — Istruzioni per Claude Code

Questo file fornisce contesto e linee guida per Claude Code quando lavora su questo progetto.

## 🎯 Contesto del Progetto

**Calcolatrice Investimenti** è una PWA mobile-first in HTML/CSS/JS vanilla, organizzata a tab, per il mercato italiano:

1. **TFR / Fondo Pensione** (rivalutazione di legge vs fondo, IRPEF automatica, risparmio 730, database ISC COVIP)
2. **PAC** (Piano di Accumulo con capitale iniziale opzionale)
3. **Conto Deposito** (vincoli multipli con date e tassi, bollo 0.20% e tasse 26%)
4. **Home** (riepilogo patrimonio totale)

L'autore è italiano, sviluppa in stile **action-oriented e decisivo**, e preferisce soluzioni snelle senza dipendenze inutili (no build step, no framework).

## 🏗️ Architettura

### Struttura file
- `index.html` — markup delle 4 viste (`#view-home`, `#view-pension`, `#view-pac`, `#view-cd`) + bottom nav
- `css/style.css` — variabili CSS root + componenti
- `js/` — moduli caricati in ordine (nessun bundler, tutto in scope globale):
  - `utils.js` → helper `$`, `gn`, `gi`, formattatori `fmtK`/`fmtEur`, stato condiviso `RESULTS`, `realValue()`/`renderReal()` (euro di oggi)
  - `pension.js` → `computePension()` (puro) + `calcPension()` (DOM) + `calcIrpef()` + `prestazioneRate()`
  - `pac.js` → `computePAC()` (puro) + `solveMonthlyForGoal()` + `calcPAC()` (DOM)
  - `cd.js` → `calcCD()` + gestione vincoli (`BONDS`)
  - `home.js` → `calcHome()` (somma i netti da `RESULTS`)
  - `covip.js` → database ISC COVIP + selettore fondo/comparto
  - `auth.js` → login Supabase + sync cloud parametri (`user_params`)
  - `app.js` → tab switching, persistenza localStorage, reset per tab, init
- `sw.js` — service worker: network-first per i file dell'app, cache-first per supabase-js (versione fissata + SRI)
- `tests/calc.test.js` — test formule con valori noti: `npm test` (node --test, carica i moduli in `vm`)

### Pattern Chiave
- La logica finanziaria sta in funzioni pure `computeX(params)` (testate); `calcX()` legge il DOM, chiama `computeX`, aggiorna gli elementi e scrive in `RESULTS.x = { net, paid, years }`
- Ogni nuovo input va collegato alla sua etichetta (`<label for>`): niente campi senza nome accessibile
- **`updateAll()`** orchestra tutti i calcoli (pension → pac → cd → home)
- Ricalcolo real-time via `oninput="updateAll()"` sugli input + listener globale per `saveState()`/`saveToCloud()` (debounce 1,5s)

### Convenzioni di Codice
- `gn(id)` / `gi(id)` per leggere input numerici (gestiscono NaN → 0)
- `fmtEur(v)` / `fmtK(v)` per output `€ 1.234` italiano
- ID HTML in **kebab-case** (`s-ral`, `pension-rate`, `d-cd-total`); prefisso `s-` per input di setup, `d-` per valori derivati/readonly
- Variabili CSS in **kebab-case** (`--purple`, `--muted`)

## 🎨 Design System

Tema scuro app-like. Colori per tab: **oro** Home, **viola** TFR (`--purple`), **verde** PAC (`--green`), **blu** Deposito (`--blue`).

Stile **A · Evoluzione** (ottobre 2026) su tutte e 4 le tab. Ogni vista definisce `--accent`, `--accent-rgb`, `--accent-light`, `--hero-from/--hero-to` (in fondo a `style.css`) e i componenti li leggono:
- `.hero` + `.summary-pill`: numero grande e pillola a colonne **versato + rendimenti − tasse = netto** (`pillReturns()` garantisce che la somma degli arrotondati torni)
- `.group-title` + `.group-card` > `.field-row`: etichetta `<label for>` a sinistra, `.field-box` con input `type=number` a destra; `.stepper` con `stepInput(id, ±1)` per anni/versamenti
- `.field-row.computed` per i valori derivati, `details.advanced` per i parametri usati di rado, `.note-card` per il suggerimento, `.instrument-row` per la lista della Home
- `.bottom-nav` a pillola sospesa
- Deposito: ogni vincolo è una `.group-card.bond-card` con righe `<label class="field-row">` (niente id sugli input dei vincoli: finirebbero nello stato salvato), `.add-btn` per aggiungerne

## ⚠️ Regole Importanti

### NON FARE
- ❌ **Non aggiungere framework** (no React, no Vue, no jQuery)
- ❌ **Non usare build tool** (no webpack, no vite, no parcel)
- ❌ **Non cambiare la palette** senza chiedere prima
- ❌ **Non aggiungere grafici nelle tab** (preferenza esplicita di Andrea)
- ❌ **Non usare input `type=text`** per i parametri: `saveState()` salva solo `input[type=number]`
- ❌ **Non toccare `cd.js` / `#view-cd` / `.bond-*`** senza richiesta esplicita (tab considerata finita; restyle A fatto su richiesta il 2026-10-17, logica invariata)

### FARE
- ✅ **Mantenere coerenza** con i pattern esistenti (`gn`, `fmtEur`, `RESULTS`, ecc.)
- ✅ **Aggiungere commenti** in italiano per le formule finanziarie
- ✅ **Testare i calcoli** con valori noti prima di committare
- ✅ **Aggiornare il README** quando si aggiungono feature
- ✅ **Mobile-first**: ogni nuova UI deve funzionare su 380px di larghezza

## 🧮 Formule Finanziarie di Riferimento

### TFR (formula italiana di legge)
```
quota_annua_TFR = RAL / 13.5
rivalutazione_legge = 1.5% + 75% × inflazione_ISTAT   (imposta sostitutiva 17% annua)
```
Con fondo pensione attivo il TFR maturando va tutto al fondo; in azienda si rivaluta solo il pregresso. A liquidazione: tassazione separata con IRPEF media sulla retribuzione di riferimento.

### Fondo Pensione
```
rendimento_netto = (lordo − costi) × (1 − tassazione_rendimenti)
prestazione: 15% sui contributi+TFR conferiti (compreso il saldo iniziale del fondo,
             non sui rendimenti), −0.3%/anno oltre 15 anni di adesione, min 9%
deducibile = min(contributo_dipendente, max(0, 5300 − contributo_azienda))   # tetto unico dal 2026
risparmio_730 = deducibile × IRPEF_marginale
IRPEF 2026: 23% fino a 28k · 33% 28–50k · 43% oltre (L. 199/2025)
```

### Conto Deposito (per vincolo, interesse semplice)
```
interessi_lordi = C × r × T
tasse = interessi_lordi × 0.26
bollo = C × 0.002 × T
netto = C + interessi_lordi − tasse − bollo
```

### PAC con interesse composto mensile
```
per ogni mese: capitale = (capitale × (1 + (tasso−TER)/12) + versamento_mensile) × (1 − 0.002/12)
                          # l'ultimo fattore è il bollo 0,20% annuo sul controvalore
capital_gain = max(0, capitale + bollo_totale − versato_totale) × aliquota
netto = capitale − capital_gain      # il bollo è già uscito dal controvalore
```

## 🚧 Roadmap & Idee

Vedi sezione "TODO / Idee Future" nel README. Priorità indicative:
1. **Scenari pessimista/ottimista** (media — solo testo, niente grafici)
2. **Export / condivisione risultati** (bassa)

## 🐛 Bug Noti

Nessuno al momento. Ricontrollare:
- Coerenza dei totali quando i parametri sono ai limiti (anni = 1, contributi = 0)

## 📦 Dipendenze Esterne

**Una sola**: `@supabase/supabase-js@2.118.0` da `cdn.jsdelivr.net` (login + sync cloud), versione fissata con hash SRI: per aggiornarla cambiare URL in `index.html` **e** `sw.js` e ricalcolare l'hash. Se non si carica (offline) `auth.js` diventa no-op e l'app resta usabile. Tutto il resto è vanilla.

## 🔁 Keep-alive Supabase

Il free tier va in pausa dopo 7 giorni senza scritture; GitHub sospende i workflow programmati dopo 60 giorni senza commit. Il workflow `supabase-keepalive.yml` si riattiva da solo via API a ogni run per evitare entrambe le cose.

## 🤝 Stile di Collaborazione

Andrea preferisce:
- **Risposte concise e dirette** in italiano
- **Vedere il risultato subito** piuttosto che lunghe pianificazioni
- **Approccio iterativo**: build → test → refine
- **Suggerimenti proattivi** se vedi miglioramenti evidenti
- **Mai deployare senza conferma esplicita**
