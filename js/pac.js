// Imposta di bollo sui prodotti finanziari: 0,20% annuo sul controvalore
// (dossier titoli / ETF), addebitata di fatto ogni anno. Qui mensilizzata.
const PAC_BOLLO_RATE = 0.002;
const GOAL_SOLVER_STEPS = 50;   // iterazioni di bisezione: precisione ben sotto il centesimo

// Calcolo puro (nessun accesso al DOM): parametri → risultati. Testato in tests/.
function computePAC({ initial, monthly, years, rate, ter, taxRate }) {
    // Rendimento netto dei costi ETF (TER deducibile annualmente, qui mensilizzato)
    const rateNet = Math.max(0, rate - ter);
    const rateM   = (rateNet / 100) / 12;

    // per ogni mese: capitale = (capitale × (1 + r/12) + versamento) × (1 − bollo/12)
    let capital  = initial;
    let bolloTot = 0;
    for (let m = 0; m < years * 12; m++) {
        capital = capital * (1 + rateM) + monthly;
        const bollo = capital * (PAC_BOLLO_RATE / 12);
        bolloTot += bollo;
        capital  -= bollo;   // il bollo esce dal controvalore, non riduce la plusvalenza tassabile
    }

    const totalPaid = initial + monthly * 12 * years;
    // Il capital gain si calcola al lordo del bollo (che è un'imposta patrimoniale a sé)
    const gainGross  = Math.max(0, capital + bolloTot - totalPaid);
    const capGainTax = gainGross * (taxRate / 100);
    const net        = capital - capGainTax;

    return {
        net, totalPaid, gainGross, capGainTax, bolloTot,
        taxes: capGainTax + bolloTot,
        gainNet: Math.max(0, net - totalPaid)
    };
}

// Versamento mensile necessario per raggiungere un capitale netto obiettivo.
// Il netto cresce in modo monotono col versamento → bisezione su [0, obiettivo].
// Ritorna 0 se basta il capitale iniziale, null se l'orizzonte è nullo.
function solveMonthlyForGoal(params, goal) {
    if (params.years <= 0) return null;
    if (computePAC({ ...params, monthly: 0 }).net >= goal) return 0;
    let lo = 0, hi = goal;
    for (let i = 0; i < GOAL_SOLVER_STEPS; i++) {
        const mid = (lo + hi) / 2;
        if (computePAC({ ...params, monthly: mid }).net >= goal) hi = mid; else lo = mid;
    }
    return hi;
}

function readPACParams() {
    return {
        initial: gn('pac-initial'),
        monthly: gn('pac-monthly'),
        years:   gi('pac-years'),
        rate:    gn('pac-rate'),
        ter:     gn('pac-ter'),
        taxRate: gn('pac-tax')
    };
}

function renderPACGoal(p) {
    const goal = gn('pac-goal');
    const out  = $('d-pac-goal-monthly');
    const sub  = $('d-pac-goal-sub');
    if (goal <= 0) {
        out.textContent = '—';
        sub.textContent = 'quanto versare al mese per arrivarci';
        return;
    }
    const need = solveMonthlyForGoal(p, goal);
    if (need === null) {
        out.textContent = '—';
        sub.textContent = 'imposta un orizzonte temporale';
        return;
    }
    out.textContent = fmtEur(Math.ceil(need)) + '/mese';
    const diff = Math.ceil(need) - p.monthly;
    sub.textContent = need === 0
        ? 'basta il capitale già investito'
        : diff > 0 ? `${fmtEur(diff)} in più di oggi` : 'il tuo versamento attuale basta';
}

function calcPAC() {
    const p = readPACParams();
    const r = computePAC(p);

    animateNumber($('pac-result'), r.net, fmtK);
    $('d-pac-paid').textContent       = fmtEur(r.totalPaid);
    $('d-pac-gain-gross').textContent = fmtEur(pillReturns(r.net, r.totalPaid, r.taxes));
    $('d-pac-taxes').textContent      = fmtEur(r.taxes);
    $('d-pac-taxes-sub').textContent  = `capital gain ${fmtEur(r.capGainTax)} + bollo ${fmtEur(r.bolloTot)}`;
    $('d-pac-gain-net').textContent   = fmtEur(r.gainNet);

    $('pac-tip').textContent = r.gainNet > 0
        ? `Stai trasformando ${fmtEur(r.totalPaid)} in ${fmtK(r.net)}, guadagnando ${fmtK(r.gainNet)} netti in ${p.years} anni.`
        : 'Con un piccolo investimento costante, il tempo è il tuo miglior alleato.';

    renderPACGoal(p);
    renderReal('pac', r.net, p.years);
    $('pac-label').textContent = `Capitale netto tra ${p.years} anni`;

    RESULTS.pac = { net: r.net, paid: r.totalPaid, years: p.years, monthly: p.monthly };
}
