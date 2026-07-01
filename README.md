# 💰 Calcolatrice Investimenti

PWA mobile-first in HTML/CSS/JS vanilla per pianificare e confrontare tre strategie di investimento per il mercato italiano: **TFR / Fondo Pensione**, **PAC** e **Conto Deposito**.

## 🎯 Caratteristiche

- **App a tab** con bottom navigation: Home (riepilogo), TFR, PAC, Deposito
- **Calcoli real-time**: ogni input aggiorna istantaneamente tutti i risultati
- **TFR vs Fondo Pensione**: rivalutazione di legge, IRPEF automatica dagli scaglioni, tassazione separata, aliquota prestazione 15%→9%, risparmio fiscale 730 con cap deducibilità €5.164,57
- **Database COVIP integrato**: ISC reali di fondi negoziali, aperti e PIP con auto-compilazione costi e rendimento atteso per comparto
- **Conto Deposito a vincoli**: più vincoli con date e tassi diversi, tasse 26% e bollo 0,20%
- **Salvataggio automatico** in localStorage + **sync cloud** opzionale con account Supabase
- **Azzeramento per tab** con un tasto
- **Zero framework, zero build step**

## 📂 Struttura del Progetto

```
calcolatrice-investimenti/
├── index.html        # Markup delle 4 viste + bottom nav
├── css/style.css     # Design system e componenti
├── js/
│   ├── utils.js      # Helper DOM ($, gn, gi) e formattatori (fmtK, fmtEur)
│   ├── pension.js    # Calcoli TFR / fondo pensione + IRPEF
│   ├── pac.js        # Calcolo PAC (interesse composto mensile)
│   ├── cd.js         # Conto deposito a vincoli
│   ├── home.js       # Riepilogo patrimonio totale
│   ├── covip.js      # Database ISC COVIP + selettore fondo
│   ├── auth.js       # Login Supabase + sync cloud dei parametri
│   └── app.js        # Tab switching, persistenza, init
├── manifest.json     # PWA manifest
└── images/           # Icone
```

## 🚀 Avvio Rapido

```bash
python3 -m http.server 8080   # oppure: npm install && npm run dev
```
Poi apri `http://localhost:8080`. Funziona anche aprendo direttamente `index.html` (serve rete per il CDN di Supabase).

## 🧮 Logica di Calcolo

### TFR in azienda
- Quota annua: `RAL ÷ 13,5` — con fondo pensione attivo il TFR maturando va tutto al fondo
- Rivalutazione del pregresso: `1,5% + 75% × inflazione`, con imposta sostitutiva 17% annua
- Liquidazione: tassazione separata con IRPEF media sulla retribuzione di riferimento

### Fondo Pensione
- Contributi dipendente + azienda (% RAL) + quota TFR, mid-year convention
- Rendimento netto = (lordo − costi) × (1 − tassazione rendimenti)
- Prestazione finale tassata solo su contributi+TFR: 15%, −0,3%/anno oltre 15 anni di adesione (min 9%)
- Risparmio 730: contributo dipendente × IRPEF marginale, cap €5.164,57/anno

### Conto Deposito (per vincolo)
- Interesse semplice `C × r × T`, tasse 26% sugli interessi, bollo 0,20%/anno sul capitale

### PAC
- Capitale iniziale opzionale + versamenti mensili, interesse composto mensile al netto del TER
- Tassazione sul capital gain (default 26%)

## 📋 TODO / Idee Future

- [ ] Service Worker per uso offline completo (PWA installabile)
- [ ] Inflazione: potere d'acquisto reale del capitale finale
- [ ] Export/condivisione risultati
- [ ] Simulazione Monte Carlo per rendimenti variabili

## 📜 Licenza

Progetto personale di Andrea. Tutti i diritti riservati.

## 💡 Note

Calcolatrice a scopo orientativo. Per decisioni reali consultare un consulente finanziario qualificato.
