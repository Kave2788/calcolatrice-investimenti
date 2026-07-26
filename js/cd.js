// ── STATO VINCOLI ──
let BONDS = [];
const BONDS_KEY = 'calc-bonds';

function loadBonds() {
    try {
        const raw = localStorage.getItem(BONDS_KEY);
        BONDS = raw ? JSON.parse(raw) : [];
    } catch(e) { BONDS = []; }
    normalizeBonds();
}

// I vincoli salvati prima dell'introduzione della durata non hanno il campo `months`:
// se inizio+durata coincide con la scadenza salvata, riaggancia la durata corrispondente,
// altrimenti resta "Personalizzata". Nessun dato esistente viene alterato.
function normalizeBonds() {
    BONDS.forEach(b => {
        if (b.months !== undefined) return;
        b.months = BOND_DURATIONS.find(m => addMonths(b.start, m) === b.end) ?? null;
    });
}

function saveBonds() {
    localStorage.setItem(BONDS_KEY, JSON.stringify(BONDS));
}

function isoDate(d) { return d.toISOString().slice(0,10); }

// Durate offerte dai conti deposito italiani (mesi). '' = scadenza personalizzata
const BOND_DURATIONS = [3, 6, 12, 18, 24, 36, 48, 60];

// Somma mesi a una data ISO, con clamp sull'ultimo giorno del mese
// (31 gennaio + 1 mese → 28/29 febbraio, non 2/3 marzo)
function addMonths(iso, months) {
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
    return isoDate(d);
}

function defaultBond() {
    const start = isoDate(new Date());
    return {
        id: Date.now() + Math.random(),
        amount: 10000,
        start,
        months: 12,               // scadenza derivata dalla durata
        end: addMonths(start, 12),
        rate: 3.0
    };
}

// ── CALCOLO SINGOLO VINCOLO ──
// Interesse semplice: C × r × T (T in anni)
// Tasse 26% sugli interessi (legge italiana), bollo 0.20%/anno sul capitale
const CD_TAX_RATE = 0.26;
const CD_BOLLO_RATE = 0.002;

function computeBond(b) {
    const start = new Date(b.start);
    const end   = new Date(b.end);
    const days  = Math.max(0, (end - start) / 86400000);
    const years = days / 365.25;

    const grossInterest = b.amount * (b.rate / 100) * years;
    const tax           = grossInterest * CD_TAX_RATE;
    const bollo         = b.amount * CD_BOLLO_RATE * years;
    const netInterest   = grossInterest - tax - bollo;
    const netTotal      = b.amount + netInterest;

    return { years, grossInterest, tax, bollo, netInterest, netTotal };
}

// ── TOGGLE EDITOR ──
function toggleBondsEditor() {
    const ed = $('cd-bonds-editor');
    const ch = $('cd-bonds-chevron');
    const open = !ed.classList.contains('open');
    ed.classList.toggle('open', open);
    ch.classList.toggle('open', open);
}

// ── ADD / REMOVE / UPDATE ──
function addBond() {
    BONDS.push(defaultBond());
    saveBonds();
    saveToCloud();   // il listener globale 'input' non scatta sul click: sincronizza a mano
    renderBonds();
    updateAll();
    if (!$('cd-bonds-editor').classList.contains('open')) toggleBondsEditor();
}

function removeBond(id) {
    BONDS = BONDS.filter(b => b.id !== id);
    saveBonds();
    saveToCloud();   // idem: la cancellazione non passa dal listener 'input'
    renderBonds();
    updateAll();
}

function updateBond(id, field, value) {
    const b = BONDS.find(x => x.id === id);
    if (!b) return;
    const card = document.querySelector(`#cd-bonds-list .bond-card[data-bond-id="${id}"]`);

    if (field === 'amount' || field === 'rate') {
        b[field] = parseFloat(value) || 0;
    } else if (field === 'months') {
        // Durata scelta dal menu: ricalcola la scadenza dalla data di inizio
        b.months = value === '' ? null : parseInt(value);
        if (b.months) {
            b.end = addMonths(b.start, b.months);
            const endEl = card?.querySelector('.bond-end');
            if (endEl) endEl.value = b.end;
        }
    } else if (field === 'start') {
        b.start = value;
        // Con una durata impostata la scadenza segue automaticamente l'inizio
        if (b.months) {
            b.end = addMonths(b.start, b.months);
            const endEl = card?.querySelector('.bond-end');
            if (endEl) endEl.value = b.end;
        }
    } else if (field === 'end') {
        // Scadenza toccata a mano → la durata diventa "personalizzata"
        b.end = value;
        b.months = null;
        const mEl = card?.querySelector('.bond-months');
        if (mEl) mEl.value = '';
    } else {
        b[field] = value;
    }

    saveBonds();
    updateBondNets();   // aggiorna solo i netti visualizzati, niente re-render (no focus loss)
    updateAll();
}

function updateBondNets() {
    const cards = document.querySelectorAll('#cd-bonds-list .bond-card');
    cards.forEach((card, idx) => {
        const b = BONDS[idx];
        if (!b) return;
        const r = computeBond(b);
        const label = card.querySelector('.bond-net-label');
        const value = card.querySelector('.bond-net-value');
        if (label) label.textContent = `Netto a scadenza (${r.years.toFixed(1)} anni)`;
        if (value) value.textContent = fmtEur(r.netTotal);
    });
}

// ── RENDER LISTA VINCOLI ──
function renderBonds() {
    const list = $('cd-bonds-list');
    if (BONDS.length === 0) {
        list.innerHTML = '<div class="bonds-empty">Nessun vincolo. Aggiungine uno per iniziare.</div>';
        return;
    }
    list.innerHTML = BONDS.map((b, idx) => {
        const r = computeBond(b);
        const durOpts = BOND_DURATIONS.map(m =>
            `<option value="${m}"${b.months === m ? ' selected' : ''}>${m < 12 ? m + ' mesi' : (m / 12) + (m === 12 ? ' anno' : ' anni')}</option>`
        ).join('');
        return `
        <div class="bond-card" data-bond-id="${b.id}">
            <div class="bond-card-header">
                <span class="bond-title">Vincolo ${idx + 1}</span>
                <button class="bond-delete" onclick="removeBond(${b.id})" title="Elimina">×</button>
            </div>
            <div class="bond-row">
                <label>Importo (€)</label>
                <input type="number" min="0" step="100" value="${b.amount}"
                    oninput="updateBond(${b.id}, 'amount', this.value)">
            </div>
            <div class="bond-row">
                <label>Data inizio</label>
                <input type="date" class="bond-start" value="${b.start}"
                    oninput="updateBond(${b.id}, 'start', this.value)">
            </div>
            <div class="bond-row">
                <label>Durata</label>
                <select class="bond-months" onchange="updateBond(${b.id}, 'months', this.value)">
                    ${durOpts}
                    <option value=""${b.months ? '' : ' selected'}>Personalizzata</option>
                </select>
            </div>
            <div class="bond-row">
                <label>Data scadenza</label>
                <input type="date" class="bond-end" value="${b.end}"
                    oninput="updateBond(${b.id}, 'end', this.value)">
            </div>
            <div class="bond-row">
                <label>Tasso lordo (%)</label>
                <input type="number" min="0" max="30" step="0.05" value="${b.rate}"
                    oninput="updateBond(${b.id}, 'rate', this.value)">
            </div>
            ${r.years <= 0 ? `<div class="bond-warning">⚠ Data scadenza precedente alla data inizio</div>` : `
            <div class="bond-net">
                <span class="bond-net-label">Netto a scadenza (${r.years.toFixed(1)} anni)</span>
                <span class="bond-net-value">${fmtEur(r.netTotal)}</span>
            </div>`}
        </div>`;
    }).join('');
}

// ── CALCOLO COMPLESSIVO ──
function calcCD() {
    let totalDeposit = 0;
    let totalNet     = 0;
    let totalGross   = 0;
    let totalGain    = 0;
    let totalTax     = 0;
    let maxYears      = 0;
    // Gli "annui" sono la fotografia di oggi: somma dei rendimenti annui dei soli
    // vincoli in corso in questo momento (i vincoli corrono in parallelo, quindi in
    // un anno maturano tutti insieme; quelli scaduti o non ancora partiti non rendono)
    let yearlyGross   = 0;
    let yearlyTax     = 0;
    let activeCount   = 0;
    const now = new Date();

    const bondResults = BONDS.map(b => {
        const r = computeBond(b);
        totalDeposit  += b.amount;
        totalGross    += b.amount + r.grossInterest;
        totalNet      += r.netTotal;
        totalGain     += r.netInterest;
        totalTax      += r.tax + r.bollo;
        if (r.years > 0 && new Date(b.start) <= now && now < new Date(b.end)) {
            const gAnno = b.amount * (b.rate / 100);            // interessi lordi di un anno pieno
            yearlyGross += gAnno;
            yearlyTax   += gAnno * CD_TAX_RATE + b.amount * CD_BOLLO_RATE;
            activeCount++;
        }
        if (r.years > maxYears) maxYears = r.years;
        return { b, r };
    });

    const yearlyNet = yearlyGross - yearlyTax;

    // Update riga readonly
    animateNumber($('d-cd-total'), totalDeposit, fmtEur);
    $('d-cd-bonds-count').textContent    = BONDS.length === 0
        ? 'Nessun vincolo'
        : BONDS.length + (BONDS.length === 1 ? ' vincolo' : ' vincoli');
    animateNumber($('d-cd-maturity-gross'), totalGross, fmtEur);
    animateNumber($('d-cd-maturity-net'), totalNet, fmtEur);
    animateNumber($('d-cd-yearly-gross'), yearlyGross, fmtEur);
    $('d-cd-yearly-sub').textContent = activeCount === 0
        ? (BONDS.length === 0 ? '—' : 'nessun vincolo attivo oggi')
        : `su ${activeCount} ${activeCount === 1 ? 'vincolo attivo' : 'vincoli attivi'} oggi`;
    animateNumber($('d-cd-yearly-net'), Math.max(0, yearlyNet), fmtEur);
    animateNumber($('d-cd-tax-yearly'), yearlyTax, fmtEur);
    animateNumber($('d-cd-tax-total'), totalTax, fmtEur);

    // Card grande: totale netto a scadenza
    $('cd-label').textContent  = BONDS.length === 0
        ? 'Aggiungi un vincolo'
        : 'Netto totale a scadenza';
    animateNumber($('cd-result'), totalNet, fmtK);

    // Tip
    $('cd-tip').textContent = 'Calcoli al netto del 26% di tasse sugli interessi e dello 0,20% annuo di bollo.';

    // Grafico: timeline mese per mese fino alla scadenza più lontana
    // Per ogni mese, somma il valore corrente di ciascun vincolo (interesse semplice maturato pro-quota)
    const totalMonths = Math.max(1, Math.ceil(maxYears * 12));
    const labels = [];
    const data   = [];
    const dataGross = [];   // serie lorda parallela, usata dal grafico Home per confronto omogeneo con TFR/PAC
    const yr0    = new Date().getFullYear();
    const today  = new Date();

    for (let m = 0; m <= totalMonths; m++) {
        const date = new Date(today);
        date.setMonth(date.getMonth() + m);

        let value = 0;
        let valueGross = 0;
        for (const { b, r } of bondResults) {
            const start = new Date(b.start);
            const end   = new Date(b.end);
            if (date <= start) {
                // non ancora iniziato → conta capitale se la data di inizio è nel passato/presente
                if (start <= today) { value += b.amount; valueGross += b.amount; }
            } else if (date >= end) {
                value      += r.netTotal;
                valueGross += b.amount + r.grossInterest;
            } else {
                const elapsedDays = (date - start) / 86400000;
                const elapsedYrs  = elapsedDays / 365.25;
                const matured     = b.amount * (b.rate / 100) * elapsedYrs;
                const matTax      = matured * CD_TAX_RATE;
                const matBollo    = b.amount * CD_BOLLO_RATE * elapsedYrs;
                value      += b.amount + matured - matTax - matBollo;
                valueGross += b.amount + matured;
            }
        }

        const yearIdx = m / 12;
        const isYearEnd = m % 12 === 0;
        labels.push(isYearEnd ? (m === 0 ? 'Oggi' : yr0 + Math.floor(yearIdx)) : '');
        data.push(Math.round(value));
        dataGross.push(Math.round(valueGross));
    }

    RESULTS.cd = { net: totalNet, gross: totalGross, paid: totalDeposit, years: Math.ceil(maxYears), series: data, seriesGross: dataGross };
    updateBondNets();
}
