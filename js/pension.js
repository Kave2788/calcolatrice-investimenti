// ── COSTANTI FISCALI ITALIANE ──
const TFR_DIVISOR     = 13.5;         // quota TFR annua = RAL / 13,5
const TFR_REVAL_FIXED = 0.015;        // rivalutazione TFR: 1,5% fisso
const TFR_REVAL_INFL  = 0.75;         // + 75% inflazione ISTAT
const TFR_REVAL_TAX   = 0.17;         // imposta sostitutiva sulla rivalutazione (annuale)
const FP_DEDUC_CAP    = 5164.57;      // limite deducibilità contributi 730
const FP_PREST_HIGH   = 0.15;         // tassazione prestazione iniziale
const FP_PREST_LOW    = 0.09;         // tassazione prestazione minima
const FP_PREST_STEP   = 0.003;        // riduzione per ogni anno > 15

// Scaglioni IRPEF 2024-2026 (riforma fiscale)
const IRPEF_SCAGLIONI = [
    { limit: 28000,    rate: 0.23 },
    { limit: 50000,    rate: 0.35 },
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

function calcPension() {
    const years    = gi('pension-years');
    const rateGross = gn('pension-rate');
    const costs     = gn('pension-costs');
    const capGain   = gn('pension-capgain');
    const infl      = gn('s-inflation') || 2.0;

    const ral        = gn('s-ral');
    const pctDip     = gn('s-emp-pct');
    const pctAz      = gn('s-comp-pct');
    const initTFR     = gn('s-tfr-initial');      // saldo TFR già in azienda
    const initFP      = gn('s-fp-initial');       // saldo già nel fondo
    const fpYearsPre     = gi('s-fp-years-pre');     // anni già nel fondo (per aliquota prestazione)
    const workYearsPre   = gi('s-work-years-pre');   // anni già lavorati (per tassazione separata TFR)

    // IRPEF calcolata in automatico dagli scaglioni vigenti
    const { marginale: irpefMarg, media: irpefMedia } = calcIrpef(ral);
    $('d-irpef-marg').textContent  = (irpefMarg  * 100).toFixed(1).replace('.0','') + '%';
    $('d-irpef-media').textContent = (irpefMedia * 100).toFixed(1).replace('.0','') + '%';

    // ── Quote annue (€) ──
    // Con fondo pensione attivo, per legge il TFR va tutto al fondo; in azienda si rivaluta solo il pregresso
    const quotaTFRAnno     = ral / TFR_DIVISOR;
    const contribDipAnno   = ral * (pctDip / 100);
    const contribAzAnno    = ral * (pctAz  / 100);
    const tfrAlFondoAnno   = quotaTFRAnno;
    const tfrInAziendaAnno = 0;
    const versatoFPAnno = contribDipAnno + contribAzAnno + tfrAlFondoAnno;
    const monthlyFP     = versatoFPAnno / 12;

    // ── Rendimento netto FP (annuo) ──
    // Lordo − costi, poi tassato sul rendimento (cap gain)
    const rateAfterCosts = Math.max(0, rateGross - costs) / 100;
    const rateNet        = rateAfterCosts * (1 - capGain / 100);

    // ── Simulazione anno per anno ──
    let capFP    = initFP;   // capitale fondo pensione (parte dal saldo iniziale)
    let capTFR   = initTFR;  // capitale TFR in azienda (parte dal saldo iniziale)
    let quoteTFRAccum = initTFR;  // base imponibile IRPEF finale (include il pregresso)
    const tfrRevalAnnua = TFR_REVAL_FIXED + TFR_REVAL_INFL * (infl / 100);

    for (let y = 1; y <= years; y++) {
        // FP: mid-year convention (versamenti distribuiti durante l'anno)
        capFP = (capFP + versatoFPAnno / 2) * (1 + rateNet) + versatoFPAnno / 2;

        // TFR azienda: rivaluta pregresso, deduci 17% sostitutiva sulla rivalutazione
        // In modalità "solo fondo" non si accantona più nuova quota annua
        const rev = capTFR * tfrRevalAnnua;
        capTFR = capTFR + rev * (1 - TFR_REVAL_TAX) + tfrInAziendaAnno;
        quoteTFRAccum += tfrInAziendaAnno;
    }

    // ── Tassazione finale FP ──
    // I rendimenti sono già stati tassati durante l'accumulo (cap gain).
    // La tassazione "prestazione finale" si applica solo su contributi+TFR conferiti,
    // NON sui rendimenti. L'aliquota considera gli anni totali di iscrizione al fondo
    // (pregressi + simulazione), così il saldo iniziale non viene sovratassato.
    const versatoFPTot  = versatoFPAnno * years;
    const totalFPYears  = fpYearsPre + years;
    const prestRate     = prestazioneRate(totalFPYears);
    const prestTax      = versatoFPTot * prestRate;
    const fpNet         = Math.max(0, capFP - prestTax);

    // ── Tassazione finale TFR in azienda (tassazione separata) ──
    // La "retribuzione di riferimento" per la tassazione separata è:
    //   rif = (TFR_totale_accantonato / anni_totali_lavoro) * 12
    // Gli anni totali includono sia quelli futuri simulati sia quelli pregressi
    // che hanno generato initTFR (stimati dalla quota annua corrente).
    const anniPregressiTFR = workYearsPre > 0 ? workYearsPre : (quotaTFRAnno > 0 ? Math.round(initTFR / quotaTFRAnno) : 0);
    const anniTotaliTFR    = Math.max(1, anniPregressiTFR + years);
    const retribizioneRif  = (quoteTFRAccum / anniTotaliTFR) * 12;
    const { media: irpefSeparatoria } = calcIrpef(retribizioneRif);
    const tfrTax = quoteTFRAccum * irpefSeparatoria;
    const tfrNet = Math.max(0, capTFR - tfrTax);

    // ── Risparmio fiscale annuo 730 ──
    // Contributo dipendente deducibile fino a 5.164,57 €/anno (NON azienda, NON TFR)
    const deducibile = Math.min(contribDipAnno, FP_DEDUC_CAP);
    const savingAnno = deducibile * irpefMarg;

    // ── Totale TFR (fondo + quota rimasta in azienda, capitali separati e addizionali) ──
    const totalNet = fpNet + tfrNet;

    // ── Output DOM ──
    $('d-pension-yearly-fund').textContent = fmtEur(versatoFPAnno);
    $('d-pension-yearly-fund-sub').textContent = `dip. ${fmtEur(contribDipAnno)} + az. ${fmtEur(contribAzAnno)} + TFR ${fmtEur(tfrAlFondoAnno)}`;
    $('d-pension-yearly-dip').textContent  = fmtEur(contribDipAnno) + ' · anno';
    $('d-pension-yearly-az').textContent   = fmtEur(contribAzAnno) + ' · anno';
    $('d-pension-prest').textContent      = (prestRate * 100).toFixed(1).replace('.0','') + '%';
    $('d-pension-prest-note').textContent = totalFPYears <= 15
        ? `15% fino a 15 anni totali di adesione`
        : `15% − 0,3% per ogni anno oltre 15 (min 9%) · ${totalFPYears} anni totali`;

    // Dettaglio breakdown TFR: due capitali separati e addizionali
    animateNumber($('pension-tfr-net'), tfrNet, fmtK);
    animateNumber($('pension-fp-net'), fpNet, fmtK);

    // Risparmio fiscale 730
    const savingTot = savingAnno * years;
    $('d-pension-saving-yearly').textContent = fmtEur(savingAnno);
    $('d-pension-saving-total').textContent  = fmtEur(savingTot);
    if (contribDipAnno <= 0) {
        $('d-pension-saving-sub').textContent = 'Nessun contributo dipendente';
    } else if (contribDipAnno > FP_DEDUC_CAP) {
        $('d-pension-saving-sub').textContent = `in ${years} anni (cap deducibile ${fmtEur(FP_DEDUC_CAP)}/anno)`;
    } else {
        $('d-pension-saving-sub').textContent = `in ${years} anni`;
    }

    // Tip
    const monthlyIncome = fpNet / (12 * 20);
    $('pension-tip').textContent = fpNet > 0
        ? `Con questi parametri potresti avere un reddito aggiuntivo di circa ${fmtEur(monthlyIncome)} al mese per i primi 20 anni di pensione.`
        : 'Inserisci i tuoi parametri per scoprire il tuo futuro finanziario.';

    animateNumber($('pension-result'), totalNet, fmtK);

    RESULTS.pension = { net: totalNet, paid: versatoFPTot, years };
}
