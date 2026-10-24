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

// Date sempre in ora locale: new Date('AAAA-MM-GG') sarebbe mezzanotte UTC e,
// riconvertita con toISOString, perderebbe un giorno al passaggio all'ora legale
function isoDate(d) {
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function parseISO(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? new Date(+m[1], m[2] - 1, +m[3]) : new Date(NaN);
}

// Durate offerte dai conti deposito italiani (mesi). '' = scadenza personalizzata
const BOND_DURATIONS = [3, 6, 12, 18, 24, 36, 48, 60];

// Somma mesi a una data ISO, con clamp sull'ultimo giorno del mese
// (31 gennaio + 1 mese → 28/29 febbraio, non 2/3 marzo)
function addMonths(iso, months) {
    const d = parseISO(iso);
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
    const start = parseISO(b.start);
    const end   = parseISO(b.end);
    // Data vuota o non valida → durata 0 (altrimenti il NaN arriverebbe fino al totale della Home)
    const validDates = !isNaN(start) && !isNaN(end);
    // round: i giorni tra due mezzanotti locali non sono interi se in mezzo c'è il cambio d'ora
    const days  = validDates ? Math.max(0, Math.round((end - start) / 86400000)) : 0;
    const years = days / 365.25;

    const grossInterest = b.amount * (b.rate / 100) * years;
    const tax           = grossInterest * CD_TAX_RATE;
    const bollo         = b.amount * CD_BOLLO_RATE * years;
    const netInterest   = grossInterest - tax - bollo;
    const netTotal      = b.amount + netInterest;

    return { validDates, years, grossInterest, tax, bollo, netInterest, netTotal };
}

// ── ADD / REMOVE / UPDATE ──
function addBond() {
    BONDS.push(defaultBond());
    saveBonds();
    saveToCloud();   // il listener globale 'input' non scatta sul click: sincronizza a mano
    renderBonds();
    updateAll();
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
        if (label) label.textContent = `Netto a scadenza (${r.years.toFixed(1).replace('.', ',')} anni)`;
        if (value) value.textContent = fmtEur(r.netTotal);
    });
}

// ── RENDER LISTA VINCOLI ──
const durationLabel = m => m < 12 ? m + ' mesi' : (m / 12) + (m === 12 ? ' anno' : ' anni');

// Riga campo: l'intera riga è una <label>, così ogni input ha il suo nome accessibile senza id
// (gli id finirebbero nello stato salvato da saveState/saveToCloud)
const bondField = (name, control) => `
            <label class="field-row">
                <span class="field-label"><span class="field-name">${name}</span></span>
                ${control}
            </label>`;

function renderBonds() {
    const list = $('cd-bonds-list');
    if (BONDS.length === 0) {
        list.innerHTML = '<div class="group-card bonds-empty">Nessun vincolo. Aggiungine uno per iniziare.</div>';
        return;
    }
    list.innerHTML = BONDS.map((b, idx) => {
        const r = computeBond(b);
        const durOpts = BOND_DURATIONS.map(m =>
            `<option value="${m}"${b.months === m ? ' selected' : ''}>${durationLabel(m)}</option>`
        ).join('');
        return `
        <div class="group-card bond-card" data-bond-id="${b.id}">
            <div class="bond-card-header">
                <span class="bond-title">Vincolo ${idx + 1}</span>
                <button type="button" class="bond-delete" onclick="removeBond(${b.id})" aria-label="Elimina vincolo ${idx + 1}">×</button>
            </div>${bondField('Importo', `<span class="field-box wide"><span class="field-affix">€</span><input type="number" class="field-input" min="0" step="100" inputmode="decimal" value="${b.amount}"
                    oninput="updateBond(${b.id}, 'amount', this.value)"></span>`)}${bondField('Data inizio', `<span class="field-box"><input type="date" class="field-input date bond-start" value="${b.start}"
                    oninput="updateBond(${b.id}, 'start', this.value)"></span>`)}${bondField('Durata', `<select class="field-select compact bond-months" onchange="updateBond(${b.id}, 'months', this.value)">
                    ${durOpts}
                    <option value=""${b.months ? '' : ' selected'}>Personalizzata</option>
                </select>`)}${bondField('Scadenza', `<span class="field-box"><input type="date" class="field-input date bond-end" value="${b.end}"
                    oninput="updateBond(${b.id}, 'end', this.value)"></span>`)}${bondField('Tasso lordo', `<span class="field-box"><input type="number" class="field-input" min="0" max="30" step="0.05" inputmode="decimal" value="${b.rate}"
                    oninput="updateBond(${b.id}, 'rate', this.value)"><span class="field-affix">%</span></span>`)}
            ${r.years <= 0 ? `<div class="field-row bond-warning" role="alert">${r.validDates ? 'La data di scadenza è precedente alla data di inizio' : 'Inserisci data di inizio e scadenza'}</div>` : `
            <div class="field-row computed">
                <span class="field-label"><span class="field-name bond-net-label">Netto a scadenza (${r.years.toFixed(1).replace('.', ',')} anni)</span></span>
                <span class="field-value bond-net-value">${fmtEur(r.netTotal)}</span>
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

    BONDS.forEach(b => {
        const r = computeBond(b);
        totalDeposit  += b.amount;
        totalGross    += b.amount + r.grossInterest;
        totalNet      += r.netTotal;
        totalGain     += r.netInterest;
        totalTax      += r.tax + r.bollo;
        if (r.years > 0 && parseISO(b.start) <= now && now < parseISO(b.end)) {
            const gAnno = b.amount * (b.rate / 100);            // interessi lordi di un anno pieno
            yearlyGross += gAnno;
            yearlyTax   += gAnno * CD_TAX_RATE + b.amount * CD_BOLLO_RATE;
            activeCount++;
        }
        if (r.years > maxYears) maxYears = r.years;
    });

    const yearlyNet = yearlyGross - yearlyTax;

    // Pillola: depositato + interessi − tasse e bollo = netto a scadenza
    animateNumber($('d-cd-total'), totalDeposit, fmtEur);
    $('d-cd-pill-interest').textContent = fmtEur(pillReturns(totalNet, totalDeposit, totalTax));
    $('d-cd-pill-taxes').textContent    = fmtEur(totalTax);
    $('d-cd-pill-gain').textContent     = fmtEur(Math.max(0, totalGain));
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
    renderReal('cd', totalNet, maxYears);

    // Tip
    $('cd-tip').textContent = 'Calcoli al netto del 26% di tasse sugli interessi e dello 0,20% annuo di bollo.';

    // years esatti (non arrotondati): usati dalla Home per il valore reale e il sottotitolo
    RESULTS.cd = { net: totalNet, paid: totalDeposit, years: maxYears };
    updateBondNets();
}
