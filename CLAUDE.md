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
  - `utils.js` → helper `$`, `gn`, `gi`, formattatori `fmtK`/`fmtEur`, stato condiviso `RESULTS`
  - `pension.js` → `calcPension()` + `calcIrpef()` + `prestazioneRate()`
  - `pac.js` → `calcPAC()`
  - `cd.js` → `calcCD()` + gestione vincoli (`BONDS`)
  - `home.js` → `calcHome()` (somma i netti da `RESULTS`)
  - `covip.js` → database ISC COVIP + selettore fondo/comparto
  - `auth.js` → login Supabase + sync cloud parametri (`user_params`)
  - `app.js` → tab switching, persistenza localStorage, reset per tab, init

### Pattern Chiave
- Ogni `calcX()` legge gli input dal DOM, aggiorna i propri elementi e scrive in `RESULTS.x = { net, paid, years }`
- **`updateAll()`** orchestra tutti i calcoli (pension → pac → cd → home)
- Ricalcolo real-time via `oninput="updateAll()"` sugli input + listener globale per `saveState()`/`saveToCloud()` (debounce 1,5s)

### Convenzioni di Codice
- `gn(id)` / `gi(id)` per leggere input numerici (gestiscono NaN → 0)
- `fmtEur(v)` / `fmtK(v)` per output `€ 1.234` italiano
- ID HTML in **kebab-case** (`s-ral`, `pension-rate`, `d-cd-total`); prefisso `s-` per input di setup, `d-` per valori derivati/readonly
- Variabili CSS in **kebab-case** (`--purple`, `--muted`)

## 🎨 Design System

Tema scuro app-like. Colori per tab: **oro** Home, **viola** TFR (`--purple`), **verde** PAC (`--green`), **blu** Deposito (`--blue`).

Componenti principali: `.result-card` (card grande risultato), `.params-section` + `.param-row` (righe parametro con icona SVG inline), `.compare-card`, `.tip-card`, `.bond-card` (editor vincoli CD), `.bottom-nav`.

## ⚠️ Regole Importanti

### NON FARE
- ❌ **Non aggiungere framework** (no React, no Vue, no jQuery)
- ❌ **Non usare build tool** (no webpack, no vite, no parcel)
- ❌ **Non cambiare la palette** senza chiedere prima
- ❌ **Non aggiungere grafici nelle tab** (preferenza esplicita di Andrea)
- ❌ **Non toccare `cd.js` / `#view-cd` / `.bond-*`** senza richiesta esplicita (tab considerata finita)

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
prestazione: 15% sui contributi+TFR, −0.3%/anno oltre 15 anni di adesione, min 9%
risparmio_730 = min(contributo_dipendente, 5164.57) × IRPEF_marginale
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
per ogni mese: capitale = capitale × (1 + (tasso−TER)/12) + versamento_mensile
tasse = max(0, capitale − versato_totale) × aliquota
```

## 🚧 Roadmap & Idee

Vedi sezione "TODO / Idee Future" nel README. Priorità indicative:
1. **Service Worker per PWA offline** (media — installabilità)
2. **Calcolo inflazione / potere d'acquisto** (bassa — sofisticazione)

## 🐛 Bug Noti

Nessuno al momento. Ricontrollare:
- Coerenza dei totali quando i parametri sono ai limiti (anni = 1, contributi = 0)

## 📦 Dipendenze Esterne

**Una sola**: `@supabase/supabase-js@2` da `cdn.jsdelivr.net` (login + sync cloud). Tutto il resto è vanilla.

## 🤝 Stile di Collaborazione

Andrea preferisce:
- **Risposte concise e dirette** in italiano
- **Vedere il risultato subito** piuttosto che lunghe pianificazioni
- **Approccio iterativo**: build → test → refine
- **Suggerimenti proattivi** se vedi miglioramenti evidenti
- **Mai deployare senza conferma esplicita**
