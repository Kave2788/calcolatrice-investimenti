// ── STATO VINCOLI ──
let BONDS = [];
const BONDS_KEY = 'calc-bonds';

function loadBonds() {
    try {
        const raw = localStorage.getItem(BONDS_KEY);
        BONDS = raw ? JSON.parse(raw) : [];
    } catch(e) { BONDS = []; }
}

function saveBonds() {
    localStorage.setItem(BONDS_KEY, JSON.stringify(BONDS));
}

function isoDate(d) { return d.toISOString().slice(0,10); }

function defaultBond() {
    const today = new Date();
    const end = new Date(today);
    end.setFullYear(end.getFullYear() + 1);
    return {
        id: Date.now() + Math.random(),
        amount: 10000,
        start: isoDate(today),
        end: isoDate(end),
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
    renderBonds();
    updateAll();
    if (!$('cd-bonds-editor').classList.contains('open')) toggleBondsEditor();
}

function removeBond(id) {
    BONDS = BONDS.filter(b => b.id !== id);
    saveBonds();
    renderBonds();
    updateAll();
}

function updateBond(id, field, value) {
    const b = BONDS.find(x => x.id === id);
    if (!b) return;
    if (field === 'amount' || field === 'rate') b[field] = parseFloat(value) || 0;
    else b[field] = value;
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
        return `
        <div class="bond-card">
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
                <input type="date" value="${b.start}"
                    oninput="updateBond(${b.id}, 'start', this.value)">
            </div>
            <div class="bond-row">
                <label>Data scadenza</label>
                <input type="date" value="${b.end}"
                    oninput="updateBond(${b.id}, 'end', this.value)">
            </div>
            <div class="bond-row">
                <label>Tasso lordo (%)</label>
                <input type="number" min="0" step="0.05" value="${b.rate}"
                    oninput="updateBond(${b.id}, 'rate', this.value)">
            </div>
            <div class="bond-net">
                <span class="bond-net-label">Netto a scadenza (${r.years.toFixed(1)} anni)</span>
                <span class="bond-net-value">${fmtEur(r.netTotal)}</span>
            </div>
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
    let maxYears    = 0;
    let yearlyGross = 0;
    let yearlyNet   = 0;

    const bondResults = BONDS.map(b => {
        const r = computeBond(b);
        totalDeposit += b.amount;
        totalGross   += b.amount + r.grossInterest;
        totalNet     += r.netTotal;
        totalGain    += r.netInterest;
        totalTax     += r.tax + r.bollo;
        // Interesse lordo e netto su base annua (rateo)
        const yGross = b.amount * (b.rate / 100);
        const yBollo = b.amount * CD_BOLLO_RATE;
        yearlyGross += yGross;
        yearlyNet   += yGross * (1 - CD_TAX_RATE) - yBollo;
        if (r.years > maxYears) maxYears = r.years;
        return { b, r };
    });

    // Update riga readonly
    $('d-cd-total').textContent          = fmtEur(totalDeposit);
    $('d-cd-bonds-count').textContent    = BONDS.length === 0
        ? 'Nessun vincolo'
        : BONDS.length + (BONDS.length === 1 ? ' vincolo' : ' vincoli');
    $('d-cd-maturity-gross').textContent = fmtEur(totalGross);
    $('d-cd-maturity-net').textContent   = fmtEur(totalNet);
    $('d-cd-yearly-gross').textContent   = fmtEur(yearlyGross);
    $('d-cd-yearly-net').textContent     = fmtEur(Math.max(0, yearlyNet));
    $('d-cd-total-tax').textContent      = fmtEur(totalTax);

    // Card grande: totale netto a scadenza
    $('cd-label').textContent  = BONDS.length === 0
        ? 'Aggiungi un vincolo'
        : 'Netto totale a scadenza';
    $('cd-result').textContent = fmtK(totalNet);

    // Tip
    $('cd-tip').textContent = 'Calcoli al netto del 26% di tasse sugli interessi e dello 0,20% annuo di bollo.';

    // Grafico: timeline mese per mese fino alla scadenza più lontana
    // Per ogni mese, somma il valore corrente di ciascun vincolo (interesse semplice maturato pro-quota)
    const totalMonths = Math.max(1, Math.ceil(maxYears * 12));
    const labels = [];
    const data   = [];
    const yr0    = new Date().getFullYear();
    const today  = new Date();

    for (let m = 0; m <= totalMonths; m++) {
        const date = new Date(today);
        date.setMonth(date.getMonth() + m);

        let value = 0;
        for (const { b, r } of bondResults) {
            const start = new Date(b.start);
            const end   = new Date(b.end);
            if (date <= start) {
                // non ancora iniziato → conta capitale se la data di inizio è nel passato/presente
                if (start <= today) value += b.amount;
            } else if (date >= end) {
                value += r.netTotal;
            } else {
                const elapsedDays = (date - start) / 86400000;
                const elapsedYrs  = elapsedDays / 365.25;
                const matured     = b.amount * (b.rate / 100) * elapsedYrs;
                const matTax      = matured * CD_TAX_RATE;
                const matBollo    = b.amount * CD_BOLLO_RATE * elapsedYrs;
                value += b.amount + matured - matTax - matBollo;
            }
        }

        const yearIdx = m / 12;
        const isYearEnd = m % 12 === 0;
        labels.push(isYearEnd ? (m === 0 ? 'Oggi' : yr0 + Math.floor(yearIdx)) : '');
        data.push(Math.round(value));
    }

    RESULTS.cd = { net: totalNet, paid: totalDeposit, years: Math.ceil(maxYears), series: data };
    setChart('cd', labels, data);
    updateBondNets();
}
