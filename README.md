# 💰 Calcolatrice Investimenti

PWA mobile-first in HTML/CSS/JS vanilla per pianificare e confrontare tre strategie di investimento per il mercato italiano: **TFR / Fondo Pensione**, **PAC** e **Conto Deposito**.

## 🎯 Caratteristiche

- **App a tab** con navigazione a pillola: Home (riepilogo), TFR, PAC, Deposito
- **Riepilogo trasparente**: ogni risultato mostra versato + rendimenti − tasse = netto
- **Calcoli real-time**: ogni input aggiorna istantaneamente tutti i risultati
- **TFR vs Fondo Pensione**: rivalutazione di legge, IRPEF 2026 automatica dagli scaglioni (23/33/43%), tassazione separata, aliquota prestazione 15%→9%, risparmio fiscale 730 con tetto deducibilità €5.300 condiviso con l'azienda
- **Database COVIP integrato**: ISC reali di fondi negoziali, aperti e PIP con auto-compilazione costi e rendimento atteso per comparto
- **PAC con obiettivo**: inserisci il capitale netto desiderato e ottieni il versamento mensile necessario
- **Potere d'acquisto**: ogni risultato mostra anche il valore in euro di oggi (inflazione dalla tab TFR)
- **Home 2.0**: patrimonio totale, capitale versato, guadagno netto e valore reale
- **Conto Deposito a vincoli**: più vincoli con date e tassi diversi, tasse 26% e bollo 0,20%, riepilogo depositato + interessi − tasse
- **Salvataggio automatico** in localStorage + **sync cloud** opzionale con account Supabase
- **Azzeramento per tab** con un tasto
- **PWA offline**: service worker network-first (aggiornamenti immediati, cache come fallback)
- **Accessibile**: etichette collegate ai campi, zoom consentito, focus da tastiera visibile, rispetto di "riduci movimento"
- **Test delle formule** con valori noti (`npm test`, zero dipendenze)
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
├── tests/            # Test formule (node --test)
├── sw.js             # Service worker offline
├── manifest.json     # PWA manifest
└── images/           # Icone
```

## 🚀 Avvio Rapido

```bash
python3 -m http.server 8080   # oppure: npm install && npm run dev
```
Poi apri `http://localhost:8080`. Test delle formule: `npm test` (serve Node ≥ 18). Funziona anche aprendo direttamente `index.html` (serve rete per il CDN di Supabase).

## 🧮 Logica di Calcolo

### TFR in azienda
- Quota annua: `RAL ÷ 13,5` — con fondo pensione attivo il TFR maturando va tutto al fondo
- Rivalutazione del pregresso: `1,5% + 75% × inflazione`, con imposta sostitutiva 17% annua
- Liquidazione: tassazione separata con IRPEF media sulla retribuzione di riferimento

### Fondo Pensione
- Contributi dipendente + azienda (% RAL) + quota TFR, mid-year convention
- Rendimento netto = (lordo − costi) × (1 − tassazione rendimenti)
- Prestazione finale tassata solo su contributi+TFR (inclusi quelli del saldo già nel fondo, non sui rendimenti): 15%, −0,3%/anno oltre 15 anni di adesione (min 9%)
- Risparmio 730: contributo dipendente deducibile × IRPEF marginale. Il tetto €5.300/anno (dal 2026, L. 199/2025) è unico per dipendente + azienda: deducibile = min(dip, 5.300 − azienda)

### Conto Deposito (per vincolo)
- Interesse semplice `C × r × T`, tasse 26% sugli interessi, bollo 0,20%/anno sul capitale
- Durata selezionabile (3/6 mesi, 1–5 anni): la scadenza si calcola dalla data di inizio, oppure si imposta a mano ("Personalizzata")
- I totali "a scadenza" sommano tutti i vincoli; il "rendimento annuo" considera solo quelli in corso oggi (i vincoli corrono in parallelo)

### PAC
- Capitale iniziale opzionale + versamenti mensili, interesse composto mensile al netto del TER
- Tassazione sul capital gain (default 26%) + bollo 0,20%/anno sul controvalore
- Obiettivo: versamento mensile trovato per bisezione sul calcolo completo (tasse e bollo inclusi)

### Valore reale
- `reale = nominale ÷ (1 + inflazione)^anni`, per strumento con il suo orizzonte

## 📋 TODO / Idee Future

- [x] Service Worker per uso offline completo (PWA installabile)
- [x] Inflazione: potere d'acquisto reale del capitale finale
- [ ] Export/condivisione risultati
- [ ] Simulazione Monte Carlo per rendimenti variabili

## 📜 Licenza

Progetto personale di Andrea. Tutti i diritti riservati.

## 💡 Note

Calcolatrice a scopo orientativo. Per decisioni reali consultare un consulente finanziario qualificato.
