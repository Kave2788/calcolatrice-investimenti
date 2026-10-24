// Test delle formule finanziarie con valori noti. Esegui: npm test (node --test, zero dipendenze)
// Fuso italiano fisso: i bug delle date (ora legale) si vedono solo fuori da UTC
process.env.TZ = 'Europe/Rome';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Carica i moduli browser (scope globale) in un contesto isolato, senza DOM
const ctx = vm.createContext({ Intl, Math, document: { getElementById: () => null } });
for (const f of ['utils.js', 'pension.js', 'pac.js', 'cd.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f });
}
const run = expr => vm.runInContext(expr, ctx);
const { calcIrpef, prestazioneRate, deducibileDipendente, computePension, computePAC, solveMonthlyForGoal } =
    run('({ calcIrpef, prestazioneRate, deducibileDipendente, computePension, computePAC, solveMonthlyForGoal })');
const realValue = run('realValue');
const { addMonths, computeBond } = run('({ addMonths, computeBond })');

const close = (actual, expected, eps = 0.01) =>
    assert.ok(Math.abs(actual - expected) <= eps, `atteso ${expected}, ottenuto ${actual}`);

const BASE_PENSION = {
    years: 10, rateGross: 4.5, costs: 1, capGain: 20, infl: 2, ral: 35000,
    pctDip: 1, pctAz: 1, initTFR: 0, initFP: 0, fpYearsPre: 0, workYearsPre: 0
};
const BASE_PAC = { initial: 0, monthly: 300, years: 20, rate: 6, ter: 0.25, taxRate: 26 };

test('IRPEF 2026: scaglioni 23% / 33% / 43%', () => {
    assert.equal(calcIrpef(0).marginale, 0);
    assert.equal(calcIrpef(0).media, 0);
    close(calcIrpef(20000).media, 0.23, 1e-9);
    assert.equal(calcIrpef(35000).marginale, 0.33);
    // 28.000 × 23% + 7.000 × 33% = 6.440 + 2.310 = 8.750
    close(calcIrpef(35000).media * 35000, 8750);
    // 6.440 + 22.000 × 33% + 10.000 × 43% = 6.440 + 7.260 + 4.300 = 18.000
    close(calcIrpef(60000).media * 60000, 18000);
    assert.equal(calcIrpef(60000).marginale, 0.43);
});

test('aliquota prestazione: 15% fino a 15 anni, −0,3%/anno, minimo 9%', () => {
    assert.equal(prestazioneRate(1), 0.15);
    assert.equal(prestazioneRate(15), 0.15);
    close(prestazioneRate(25), 0.12, 1e-9);
    assert.equal(prestazioneRate(35), 0.09);
    assert.equal(prestazioneRate(50), 0.09);
});

test('deducibilità: tetto 5.300 € condiviso tra dipendente e azienda', () => {
    assert.equal(deducibileDipendente(1000, 1000), 1000);
    assert.equal(deducibileDipendente(4000, 2000), 3300);
    assert.equal(deducibileDipendente(3000, 6000), 0);
});

test('fondo pensione: un anno senza rendimento restituisce il versato tassato al 15%', () => {
    const r = computePension({ ...BASE_PENSION, years: 1, rateGross: 0, costs: 0, ral: 27000 });
    // versato = 270 + 270 + 2.000 = 2.540 → netto = 2.540 × 0,85
    close(r.versatoFPAnno, 2540);
    close(r.fpNet, 2540 * 0.85);
    assert.equal(r.tfrNet, 0);
});

test('fondo pensione: rendimento netto composto con mid-year convention', () => {
    const r = computePension({ ...BASE_PENSION, years: 2, rateGross: 6, costs: 1, capGain: 20, ral: 27000 });
    const v = 2540, rn = 0.05 * 0.8;
    let cap = 0;
    for (let y = 0; y < 2; y++) cap = (cap + v / 2) * (1 + rn) + v / 2;
    close(r.fpNet, cap - 2 * v * 0.15);
});

test('risparmio 730 = contributo deducibile × IRPEF marginale', () => {
    const r = computePension({ ...BASE_PENSION, ral: 40000, pctDip: 2, pctAz: 2 });
    close(r.savingAnno, 800 * 0.33);
    close(r.savingTot, 800 * 0.33 * 10);
    // contributi alti: l'azienda consuma il tetto, il dipendente deduce solo il residuo
    const high = computePension({ ...BASE_PENSION, ral: 100000, pctDip: 4, pctAz: 3 });
    close(high.deducibile, 5300 - 3000);
});

test('TFR in azienda: rivalutazione 1,5% + 75% inflazione al netto del 17%', () => {
    const r = computePension({ ...BASE_PENSION, years: 1, ral: 0, initTFR: 10000, workYearsPre: 5 });
    const cap = 10000 * (1 + 0.03 * 0.83);
    // retribuzione di riferimento = 10.000 / 6 × 12 = 20.000 → IRPEF media 23%
    close(r.tfrNet, cap - 10000 * 0.23);
    close(r.paid, 10000);
});

test('limiti: anni = 0 e contributi nulli non producono NaN né valori negativi', () => {
    const r = computePension({ ...BASE_PENSION, years: 0, ral: 0 });
    assert.equal(r.totalNet, 0);
    assert.equal(r.savingAnno, 0);
    const pac = computePAC({ ...BASE_PAC, monthly: 0, years: 0 });
    assert.equal(pac.net, 0);
});

test('PAC: senza rendimento il netto è il versato meno il bollo', () => {
    const r = computePAC({ ...BASE_PAC, monthly: 100, years: 1, rate: 0, ter: 0 });
    assert.equal(r.totalPaid, 1200);
    assert.equal(r.capGainTax, 0);
    close(r.net, 1200 - r.bolloTot);
    assert.ok(r.bolloTot > 0 && r.bolloTot < 1200 * 0.002);
});

test('PAC: formula mensile con TER, bollo e capital gain', () => {
    const r = computePAC(BASE_PAC);
    const rm = (0.0575) / 12;
    let cap = 0, bollo = 0;
    for (let m = 0; m < 240; m++) { cap = cap * (1 + rm) + 300; const b = cap * 0.002 / 12; bollo += b; cap -= b; }
    const tax = (cap + bollo - 72000) * 0.26;
    close(r.net, cap - tax);
    close(r.taxes, tax + bollo);
});

test('obiettivo PAC: il versamento trovato raggiunge esattamente il target', () => {
    const goal = 150000;
    const need = solveMonthlyForGoal(BASE_PAC, goal);
    close(computePAC({ ...BASE_PAC, monthly: need }).net, goal, 0.5);
    assert.equal(solveMonthlyForGoal({ ...BASE_PAC, initial: 1e6 }, goal), 0);
    assert.equal(solveMonthlyForGoal({ ...BASE_PAC, years: 0 }, goal), null);
});

test('valore reale: sconto composto dell inflazione', () => {
    close(realValue(121, 2, 10), 100);
    assert.equal(realValue(500, 0, 2), 500);
});

test('pillola TFR: versato + rendimenti − tasse finali = netto totale', () => {
    for (const extra of [{}, { initTFR: 20000, initFP: 8000, workYearsPre: 10 }, { years: 1, rateGross: 0 }]) {
        const r = computePension({ ...BASE_PENSION, ...extra });
        close(r.paid + r.returns - r.taxesFinal, r.totalNet);
        assert.ok(r.taxesFinal >= 0);
    }
});

test('vincoli: addMonths resta sullo stesso giorno anche col cambio d ora', () => {
    assert.equal(addMonths('2026-01-15', 6), '2026-07-15');   // solare → legale
    assert.equal(addMonths('2026-04-15', 6), '2026-10-15');
    assert.equal(addMonths('2026-03-01', 3), '2026-06-01');
    assert.equal(addMonths('2026-01-31', 1), '2026-02-28');   // clamp a fine mese
    assert.equal(addMonths('2024-01-31', 1), '2024-02-29');   // bisestile
});

test('vincoli: interesse semplice, tasse 26% e bollo 0,20%', () => {
    const r = computeBond({ amount: 10000, rate: 3, start: '2026-01-01', end: '2027-01-01' });
    const y = 365 / 365.25;
    close(r.years, y, 1e-9);
    close(r.grossInterest, 300 * y);
    close(r.netTotal, 10000 + 300 * y * 0.74 - 20 * y);
});

test('vincoli: date vuote o invertite danno durata 0, mai NaN', () => {
    for (const b of [{ start: '', end: '2027-01-01' }, { start: '2026-01-01', end: '' }, { start: '2027-01-01', end: '2026-01-01' }]) {
        const r = computeBond({ amount: 10000, rate: 3, ...b });
        assert.equal(r.years, 0);
        assert.equal(r.netTotal, 10000);
    }
    assert.equal(computeBond({ amount: 1, rate: 1, start: '', end: '' }).validDates, false);
});

test('inflazione: 0% è un valore valido, il vuoto usa il default', () => {
    const c = vm.createContext({ Intl, Math, document: { getElementById: () => ({ value: '0' }) } });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'utils.js'), 'utf8'), c);
    assert.equal(vm.runInContext('getInflation()', c), 0);
    c.document.getElementById = () => ({ value: '' });
    assert.equal(vm.runInContext('getInflation()', c), 2);
});
