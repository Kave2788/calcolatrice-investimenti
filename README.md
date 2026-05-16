# 💰 Calcolatrice Investimenti

Calcolatrice fintech in HTML/CSS/JS single-file per confrontare quattro strategie d'investimento: **TFR senza fondo**, **TFR con fondo pensione**, **Conto Deposito** e **PAC** (Piano di Accumulo).

## 🎯 Caratteristiche

- **Single-file PWA-ready**: tutto in un unico `index.html` (HTML + CSS + JS inline)
- **Calcoli real-time**: ogni input aggiorna istantaneamente tutti i risultati
- **Sezioni espandibili**: UI pulita con collapse/expand
- **Grafico comparativo**: barre orizzontali con Chart.js (CDN)
- **Tabella di confronto**: vista riassuntiva di tutti gli scenari
- **Capitale Totale Combinato**: somma intelligente del miglior TFR + Conto + PAC
- **Responsive**: layout a 1/2/3 colonne (mobile/tablet/desktop)
- **Palette lussuosa**: blu profondo + oro (`#0F3A66` + `#D4AF37`)

## 📂 Struttura del Progetto

```
calcolatrice-investimenti/
├── index.html        # File principale (HTML + CSS + JS)
├── README.md         # Questo file
├── CLAUDE.md         # Istruzioni per Claude Code
├── package.json      # Configurazione dev server (opzionale)
└── .gitignore        # File da escludere da git
```

## 🚀 Avvio Rapido

### Opzione 1 — Apertura diretta
Apri semplicemente `index.html` in un browser. Funziona offline tranne per Chart.js (caricato da CDN).

### Opzione 2 — Dev Server con Python
```bash
python3 -m http.server 8080
```
Poi apri `http://localhost:8080`.

### Opzione 3 — Dev Server con Node
```bash
npm install
npm run dev
```

## 🧮 Logica di Calcolo

### TFR Senza Fondo Pensione
- Quota annua: `RAL ÷ 13.5` (formula di legge italiana)
- Adeguamento carriera: la RAL cresce ogni anno della percentuale impostata
- Rendimento netto: `rendimento_lordo − costi_gestione`
- Simulazione anno per anno con interesse composto

### TFR Con Fondo Pensione
- Contributi annuali (dipendente + azienda) lordi
- **Fase 1 / Fase 2**: contributi modificabili dopo X anni
- **Recupero fiscale 7.30%** sui contributi totali, accumulato nel fondo
- Tassazione finale **solo sul capital gain** (default 15% per >35 anni)

### Conto Deposito
- Interesse composto annuo sul capitale vincolato
- **Tasse 26%** sugli interessi maturati
- **Imposta di bollo 0.20%** annua sul capitale (sottratta dal finale)

### PAC (Piano di Accumulo)
- PIC opzionale all'avvio + versamenti mensili
- Interesse composto mensile (`tasso ÷ 12`)
- Tassazione su capital gain (default 26% ETF azionari, 12.5% titoli di Stato)

## 🛠️ Stack Tecnologico

- **HTML5 + CSS3 + Vanilla JS**: zero framework, zero build step
- **Chart.js 3.9.1**: caricato da `cdnjs.cloudflare.com` per il grafico comparativo
- **Intl.NumberFormat**: formattazione valuta italiana nativa
- **CSS Grid + Flexbox**: layout responsive senza media query complesse

## 🎨 Personalizzazione

Le variabili CSS sono in cima al file `index.html`:

```css
:root {
    --primary: #0F3A66;      /* Blu profondo */
    --secondary: #D4AF37;    /* Oro */
    --accent: #1E5A96;       /* Blu accento */
    /* ... */
}
```

## 📋 TODO / Idee Future

- [ ] Salvataggio scenari in localStorage
- [ ] Export risultati in PDF
- [ ] Confronto storico dei calcoli effettuati
- [ ] Dark mode
- [ ] Modalità "wizard" per utenti meno esperti
- [ ] Service Worker per uso offline completo (PWA)
- [ ] Grafico evoluzione capitale anno per anno
- [ ] Inflazione: calcolo del potere d'acquisto reale
- [ ] Simulazione Monte Carlo per rendimenti variabili

## 📜 Licenza

Progetto personale di Andrea. Tutti i diritti riservati.

## 💡 Note

Calcolatrice a scopo orientativo. Per decisioni reali consultare un consulente finanziario qualificato.
