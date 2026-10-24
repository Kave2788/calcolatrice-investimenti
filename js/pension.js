// ── COSTANTI FISCALI ITALIANE ──
const TFR_DIVISOR     = 13.5;         // quota TFR annua = RAL / 13,5
const TFR_REVAL_FIXED = 0.015;        // rivalutazione TFR: 1,5% fisso
const TFR_REVAL_INFL  = 0.75;         // + 75% inflazione ISTAT
const TFR_REVAL_TAX   = 0.17;         // imposta sostitutiva sulla rivalutazione (annuale)
// Limite deducibilità contributi FP: 5.300 € dal 2026 (L. 199/2025, prima 5.164,57 €).
// Il tetto è UNICO per dipendente + datore di lavoro (art. 8 D.Lgs 252/2005); il TFR non conta.
const FP_DEDUC_CAP    = 5300;
const FP_PREST_HIGH   = 0.15;         // tassazione prestazione iniziale
const FP_PREST_LOW    = 0.09;         // tassazione prestazione minima
const FP_PREST_STEP   = 0.003;        // riduzione per ogni anno > 15
const MONTHS_PENSION_INCOME = 12 * 20; // rendita stimata sui primi 20 anni di pensione

// Scaglioni IRPEF dal 2026 (L. 199/2025: 2° scaglione dal 35% al 33%)
const IRPEF_SCAGLIONI = [
    { limit: 28000,    rate: 0.23 },
    { limit: 50000,    rate: 0.33 },
    { limit: Infinity, rate: 0.43 }
];

// Calcola IRPEF marginale (scaglione attivo) e media (effettiva) per una data RAL
function calcIrpef(ral) {
    if (ral <= 0) return { marginale: 0, media: 0 };
    let tax = 0, prev = 0, marg = IRPEF_SCAGLIONI[0].rate;
    for (const s of IRPEF_SCAGLIONI) {
        if (ral > prev) {
            const slice = Math.min(ral, s.limit) - prev;
            tax += slice * s.rate;
            marg = s.rate;
        }
        if (ral <= s.limit) break;
        prev = s.limit;
    }
    return { marginale: marg, media: tax / ral };
}

// Aliquota prestazione FP: 15% per primi 15 anni, poi -0,3%/anno fino a 9% (35 anni)
function prestazioneRate(years) {
    if (years <= 15) return FP_PREST_HIGH;
    const reduction = (years - 15) * FP_PREST_STEP;
    return Math.max(FP_PREST_LOW, FP_PREST_HIGH - reduction);
}

// Contributo dipendente deducibile: il tetto è condiviso, la quota azienda lo "consuma" per prima
function deducibileDipendente(contribDip, contribAz) {
    return Math.min(contribDip, Math.max(0, FP_DEDUC_CAP - contribAz));
}

// Calcolo puro (nessun accesso al DOM): parametri → risultati. Testato in tests/.
function computePension(p) {
    const { years, rateGross, costs, capGain, infl, ral, pctDip, pctAz,
            initTFR, initFP, fpYearsPre, workYearsPre } = p;

    const { marginale: irpefMarg, media: irpefMedia } = calcIrpef(ral);

    // ── Quote annue (€) ──
    // Con fondo pensione attivo, per legge il TFR va tutto al fondo; in azienda si rivaluta solo il pregresso
    const quotaTFRAnno   = ral / TFR_DIVISOR;
    const contribDipAnno = ral * (pctDip / 100);
    const contribAzAnno  = ral * (pctAz  / 100);
    const tfrAlFondoAnno = quotaTFRAnno;
    const versatoFPAnno  = contribDipAnno + contribAzAnno + tfrAlFondoAnno;

    // ── Rendimento netto FP (annuo) ──
    // Lordo − costi, poi tassato sul rendimento (cap gain)
    const rateAfterCosts = Math.max(0, rateGross - costs) / 100;
    const rateNet        = rateAfterCosts * (1 - capGain / 100);

    // ── Simulazione anno per anno ──
    let capFP  = initFP;   // capitale fondo pensione (parte dal saldo iniziale)
    let capTFR = initTFR;  // TFR in azienda: solo il pregresso, che si rivaluta
    const quoteTFRAccum = initTFR;  // base imponibile IRPEF finale (nessuna nuova quota in azienda)
    const tfrRevalAnnua = TFR_REVAL_FIXED + TFR_REVAL_INFL * (infl / 100);

    for (let y = 1; y <= years; y++) {
        // FP: mid-year convention (versamenti distribuiti durante l'anno)
        capFP = (capFP + versatoFPAnno / 2) * (1 + rateNet) + versatoFPAnno / 2;
        // TFR azienda: rivalutazione al netto della sostitutiva 17%
        capTFR += capTFR * tfrRevalAnnua * (1 - TFR_REVAL_TAX);
    }

    // ── Tassazione finale FP ──
    // I rendimenti sono già stati tassati durante l'accumulo (cap gain).
    // La tassazione "prestazione finale" si applica solo su contributi+TFR conferiti,
    // NON sui rendimenti. L'aliquota considera gli anni totali di iscrizione al fondo
    // (pregressi + simulazione), così il saldo iniziale non viene sovratassato.
    // Approssimazione prudenziale: si tassa l'intero saldo iniziale, senza scorporare
    // la quota di rendimenti già maturati, che non è ricavabile dai dati inseriti.
    const versatoFPTot     = versatoFPAnno * years;
    const baseImponibileFP = versatoFPTot + initFP;
    const totalFPYears     = fpYearsPre + years;
    const prestRate        = prestazioneRate(totalFPYears);
    const prestTax         = baseImponibileFP * prestRate;
    const fpNet            = Math.max(0, capFP - prestTax);

    // ── Tassazione finale TFR in azienda (tassazione separata) ──
    //   retribuzione_rif = (TFR_accantonato / anni_totali_lavoro) × 12
    // Gli anni pregressi, se non indicati, si stimano dalla quota annua corrente.
    const anniPregressiTFR = workYearsPre > 0 ? workYearsPre : (quotaTFRAnno > 0 ? Math.round(initTFR / quotaTFRAnno) : 0);
    const anniTotaliTFR    = Math.max(1, anniPregressiTFR + years);
    const retribuzioneRif  = (quoteTFRAccum / anniTotaliTFR) * 12;
    const { media: irpefSeparata } = calcIrpef(retribuzioneRif);
    const tfrTax = quoteTFRAccum * irpefSeparata;
    const tfrNet = Math.max(0, capTFR - tfrTax);

    // ── Risparmio fiscale annuo 730 ──
    // risparmio = contributo_dipendente_deducibile × IRPEF_marginale
    const deducibile = deducibileDipendente(contribDipAnno, contribAzAnno);
    const savingAnno = deducibile * irpefMarg;
    const paid       = versatoFPTot + initFP + initTFR;   // capitale conferito totale (pregresso incluso)

    return {
        irpefMarg, irpefMedia,
        contribDipAnno, contribAzAnno, tfrAlFondoAnno, versatoFPAnno, versatoFPTot,
        totalFPYears, prestRate,
        fpNet, tfrNet, totalNet: fpNet + tfrNet,
        deducibile, savingAnno, savingTot: savingAnno * years,
        monthlyIncome: fpNet / MONTHS_PENSION_INCOME,
        paid,
        // Scomposizione del netto per la pillola di riepilogo:
        //   netto = versato + rendimenti (già al netto della tassazione annua) − tasse finali
        taxesFinal: Math.min(prestTax, capFP) + Math.min(tfrTax, capTFR),
        returns: fpNet + tfrNet + Math.min(prestTax, capFP) + Math.min(tfrTax, capTFR) - paid
    };
}

// Legge i parametri dal DOM
function readPensionParams() {
    return {
        years:        gi('pension-years'),
        rateGross:    gn('pension-rate'),
        costs:        gn('pension-costs'),
        capGain:      gn('pension-capgain'),
        infl:         getInflation(),
        ral:          gn('s-ral'),
        pctDip:       gn('s-emp-pct'),
        pctAz:        gn('s-comp-pct'),
        initTFR:      gn('s-tfr-initial'),    // saldo TFR già in azienda
        initFP:       gn('s-fp-initial'),     // saldo già nel fondo
        fpYearsPre:   gi('s-fp-years-pre'),   // anni già nel fondo (per aliquota prestazione)
        workYearsPre: gi('s-work-years-pre')  // anni già lavorati (per tassazione separata TFR)
    };
}

const fmtPct = v => (v * 100).toFixed(1).replace('.0', '') + '%';

function calcPension() {
    const p = readPensionParams();
    const r = computePension(p);

    $('d-irpef-marg').textContent  = fmtPct(r.irpefMarg);
    $('d-irpef-media').textContent = fmtPct(r.irpefMedia);

    $('d-pension-yearly-fund').textContent = fmtEur(r.versatoFPAnno);
    $('d-pension-yearly-fund-sub').textContent = `dip. ${fmtEur(r.contribDipAnno)} + az. ${fmtEur(r.contribAzAnno)} + TFR ${fmtEur(r.tfrAlFondoAnno)}`;
    $('d-pension-yearly-dip').textContent  = fmtEur(r.contribDipAnno) + ' · anno';
    $('d-pension-yearly-az').textContent   = fmtEur(r.contribAzAnno) + ' · anno';
    $('d-pension-prest').textContent       = fmtPct(r.prestRate);
    $('d-pension-prest-note').textContent  = r.totalFPYears <= 15
        ? `15% fino a 15 anni totali di adesione`
        : `15% − 0,3% per ogni anno oltre 15 (min 9%) · ${r.totalFPYears} anni totali`;

    // Dettaglio breakdown TFR: due capitali separati e addizionali
    animateNumber($('pension-tfr-net'), r.tfrNet, fmtK);
    animateNumber($('pension-fp-net'), r.fpNet, fmtK);

    // Risparmio fiscale 730
    $('d-pension-saving-yearly').textContent = fmtEur(r.savingAnno);
    $('d-pension-saving-total').textContent  = fmtEur(r.savingTot);
    if (r.contribDipAnno <= 0) {
        $('d-pension-saving-sub').textContent = 'Nessun contributo dipendente';
    } else if (r.deducibile < r.contribDipAnno) {
        $('d-pension-saving-sub').textContent = `in ${p.years} anni · tetto ${fmtEur(FP_DEDUC_CAP)}/anno condiviso con l'azienda`;
    } else {
        $('d-pension-saving-sub').textContent = `in ${p.years} anni`;
    }

    $('pension-tip').textContent = r.fpNet > 0
        ? `Con questi parametri potresti avere un reddito aggiuntivo di circa ${fmtEur(r.monthlyIncome)} al mese per i primi 20 anni di pensione.`
        : 'Inserisci i tuoi parametri per scoprire il tuo futuro finanziario.';

    animateNumber($('pension-result'), r.totalNet, fmtK);
    renderReal('pension', r.totalNet, p.years);
    $('pension-label').textContent = `Capitale netto tra ${p.years} anni`;
    // Pillola: versato + rendimenti − tasse finali = netto
    $('d-pension-pill-paid').textContent    = fmtEur(r.paid);
    $('d-pension-pill-returns').textContent = fmtEur(pillReturns(r.totalNet, r.paid, r.taxesFinal));
    $('d-pension-pill-taxes').textContent   = fmtEur(r.taxesFinal);

    RESULTS.pension = { net: r.totalNet, paid: r.paid, years: p.years, monthlyIncome: r.monthlyIncome };
}
