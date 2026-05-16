# CLAUDE.md — Istruzioni per Claude Code

Questo file fornisce contesto e linee guida per Claude Code quando lavora su questo progetto.

## 🎯 Contesto del Progetto

**Calcolatrice Investimenti** è una PWA single-file in HTML/CSS/JS vanilla che confronta quattro strategie di investimento per il mercato italiano:

1. **TFR Senza Fondo Pensione** (rivalutazione di legge)
2. **TFR Con Fondo Pensione** (con contributi dipendente/azienda + recupero fiscale 730)
3. **Conto Deposito** (con bollo 0.20% e tasse 26%)
4. **PAC** (Piano di Accumulo con PIC opzionale)

L'autore è italiano, sviluppa in stile **action-oriented, decisivo, single-file**, e preferisce soluzioni snelle senza dipendenze esterne (no Netlify, no build step).

## 🏗️ Architettura

### File Singolo
Tutto il codice è in `index.html`:
- **HTML**: struttura dichiarativa con sezioni `.section` collassabili
- **CSS** (in `<style>`): variabili CSS root + grid responsivo + componenti
- **JavaScript** (in `<script>`): funzioni di calcolo + listeners + rendering Chart.js

### Pattern Chiave
- **Funzioni di calcolo separate** per ogni scenario: `calculateTFRWithoutPension()`, `calculateTFRWithPension()`, `calculateContoDeposito()`, `calculatePAC()`
- Ogni funzione ritorna un oggetto: `{ initial, contrib, gain, final }`
- **`updateAll()`** orchestra tutti i calcoli e aggiorna DOM + grafico
- **Event listener globale** su tutti gli `<input>` per ricalcolo real-time

### Convenzioni di Codice
- `getNum(id)` e `getInt(id)` come helper per leggere input numerici (gestiscono NaN)
- `formatCurrency(value)` per output `€ 1.234,56` italiano
- ID HTML in **camelCase** (`pensionInitial`, `tfrRAL`, `cdRate`)
- Variabili CSS in **kebab-case** (`--primary`, `--text-muted`)

## 🎨 Design System

### Colori
```css
--primary: #0F3A66      /* Blu profondo - header, totali */
--secondary: #D4AF37    /* Oro - valori importanti, accenti */
--accent: #1E5A96       /* Blu medio - hover, gradient */
--success: #10B981      /* Verde - Conto Deposito */
--warning: #F59E0B      /* Arancio - PAC */
```

### Componenti
- `.section` → card principale con header collassabile
- `.subsection` → blocco interno con bordo dorato a sinistra
- `.subsection.results` → blocco risultati con sfondo gradient dorato
- `.calculation-row` → riga label/valore (default, `.highlight`, `.total`)
- `.scenario-tag` → tag colorato per identificare strategia (`.tfr-no`, `.tfr-yes`, `.cd`, `.pac`)

## ⚠️ Regole Importanti

### NON FARE
- ❌ **Non aggiungere framework** (no React, no Vue, no jQuery)
- ❌ **Non separare in più file** salvo richiesta esplicita
- ❌ **Non usare build tool** (no webpack, no vite, no parcel)
- ❌ **Non rimuovere** il pattern single-file PWA
- ❌ **Non cambiare la palette** senza chiedere prima

### FARE
- ✅ **Mantenere coerenza** con i pattern esistenti (`getNum`, `formatCurrency`, ecc.)
- ✅ **Aggiungere commenti** in italiano per le formule finanziarie
- ✅ **Testare i calcoli** con valori noti prima di committare
- ✅ **Aggiornare il README** quando si aggiungono feature
- ✅ **Mobile-first**: ogni nuova UI deve funzionare su 380px di larghezza

## 🧮 Formule Finanziarie di Riferimento

### TFR (formula italiana di legge)
```
quota_annua_TFR = RAL / 13.5
rivalutazione_legge = 1.5% + 75% × inflazione_ISTAT
```

### Recupero Fiscale Fondo Pensione
```
recupero_annuo = contributi_versati × 0.073
```
Massimo deducibile: €5.164,57/anno (NON ancora implementato, possibile feature)

### Conto Deposito
```
interesse_lordo_anno_n = capitale_anno_n × tasso
imposta_bollo_totale = capitale_iniziale × 0.002 × anni
tasse_interessi = interessi_lordi_totali × 0.26
capitale_finale = capitale_iniziale + interessi_netti − imposta_bollo
```

### PAC con interesse composto mensile
```
per ogni mese:
  capitale = capitale × (1 + tasso/12)
  capitale += versamento_mensile

capital_gain = capitale_finale − PIC − totale_versato
tasse = capital_gain × aliquota
```

## 🚧 Roadmap & Idee

Vedi sezione "TODO / Idee Future" nel README. Priorità indicative:
1. **Salvataggio scenari in localStorage** (alta — UX)
2. **Grafico evoluzione anno per anno** (alta — pedagogica)
3. **Service Worker per PWA offline** (media — installabilità)
4. **Limite deducibilità €5.164,57** (media — accuratezza fiscale)
5. **Calcolo inflazione** (bassa — sofisticazione)

## 🐛 Bug Noti

Nessuno al momento. Ricontrollare:
- Coerenza dei totali quando i parametri sono ai limiti (anni = 1, contributi = 0)
- Formula del TFR con adeguamento carriera elevato (>5%)

## 📦 Dipendenze Esterne

**Una sola**: Chart.js 3.9.1 da `cdnjs.cloudflare.com`. Se serve offline puro, scaricarla in locale.

## 🤝 Stile di Collaborazione

Andrea preferisce:
- **Risposte concise e dirette** in italiano
- **Vedere il risultato subito** piuttosto che lunghe pianificazioni
- **Approccio iterativo**: build → test → refine
- **Suggerimenti proattivi** se vedi miglioramenti evidenti
