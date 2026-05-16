// ── COSTANTI FISCALI ITALIANE ──
const TFR_DIVISOR     = 13.5;         // quota TFR annua = RAL / 13,5
const TFR_REVAL_FIXED = 0.015;        // rivalutazione TFR: 1,5% fisso
const TFR_REVAL_INFL  = 0.75;         // + 75% inflazione ISTAT
const TFR_REVAL_TAX   = 0.17;         // imposta sostitutiva sulla rivalutazione (annuale)
const FP_DEDUC_CAP    = 5164.57;      // limite deducibilità contributi 730
const FP_PREST_HIGH   = 0.15;         // tassazione prestazione iniziale
const FP_PREST_LOW    = 0.09;         // tassazione prestazione minima
const FP_PREST_STEP   = 0.003;        // riduzione per ogni anno > 15

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
    const infl      = 2.0;   // inflazione media ipotizzata per rivalutazione TFR di legge

    const ral     = gn('s-ral');
    const pctDip  = gn('s-emp-pct');
    const pctAz   = gn('s-comp-pct');
    const pctTFR  = gn('s-tfr-pct');
    const irpef   = gn('s-irpef');

    // ── Quote annue (€) ──
    const quotaTFRAnno   = ral / TFR_DIVISOR;
    const contribDipAnno = ral * (pctDip / 100);
    const contribAzAnno  = ral * (pctAz  / 100);
    const tfrAlFondoAnno = quotaTFRAnno * (pctTFR / 100);
    const tfrInAziendaAnno = quotaTFRAnno - tfrAlFondoAnno;
    const versatoFPAnno = contribDipAnno + contribAzAnno + tfrAlFondoAnno;
    const monthlyFP     = versatoFPAnno / 12;

    // ── Rendimento netto FP (annuo) ──
    // Lordo − costi, poi tassato sul rendimento (cap gain)
    const rateAfterCosts = Math.max(0, rateGross - costs) / 100;
    const rateNet        = rateAfterCosts * (1 - capGain / 100);

    // ── Simulazione anno per anno ──
    const labels = [], dataFP = [], dataTFR = [];
    let capFP    = 0;   // capitale fondo pensione
    let capTFR   = 0;   // capitale TFR in azienda (già al netto del 17% sostitutivo)
    let quoteTFRAccum = 0;  // somma delle quote accantonate (base imponibile IRPEF finale)
    const yr0    = new Date().getFullYear();
    const tfrRevalAnnua = TFR_REVAL_FIXED + TFR_REVAL_INFL * (infl / 100);

    // Push valore iniziale (anno 0)
    labels.push('Oggi');
    dataFP.push(0);
    dataTFR.push(0);

    for (let y = 1; y <= years; y++) {
        // FP: capitalizza il pregresso, poi aggiungi versato annuo
        capFP = capFP * (1 + rateNet) + versatoFPAnno;

        // TFR azienda: rivaluta pregresso, deduci 17% sostitutiva sulla rivalutazione, aggiungi quota annua
        const rev = capTFR * tfrRevalAnnua;
        capTFR = capTFR + rev * (1 - TFR_REVAL_TAX) + quotaTFRAnno;
        quoteTFRAccum += quotaTFRAnno;

        const showLabel = y === years || (years > 10 ? y % 10 === 0 : y % 5 === 0);
        labels.push(showLabel ? (yr0 + y) : '');
        dataFP.push(Math.round(capFP));
        dataTFR.push(Math.round(capTFR));
    }

    // ── Tassazione finale FP ──
    // I rendimenti sono già stati tassati durante l'accumulo (cap gain).
    // La tassazione "prestazione finale" si applica solo su contributi+TFR conferiti,
    // NON sui rendimenti.
    const versatoFPTot = versatoFPAnno * years;
    const prestRate    = prestazioneRate(years);
    const prestTax     = versatoFPTot * prestRate;
    const fpNet        = Math.max(0, capFP - prestTax);

    // ── Tassazione finale TFR in azienda ──
    // Aliquota media IRPEF degli ultimi 5 anni (semplificazione: usiamo IRPEF inserita).
    // Si applica SOLO sulle quote accantonate (non sulla rivalutazione, già tassata 17% annuo).
    const tfrTax = quoteTFRAccum * (irpef / 100);
    const tfrNet = Math.max(0, capTFR - tfrTax);

    // ── Risparmio fiscale annuo 730 ──
    // Contributo dipendente deducibile fino a 5.164,57 €/anno (NON azienda, NON TFR)
    const deducibile = Math.min(contribDipAnno, FP_DEDUC_CAP);
    const savingAnno = deducibile * (irpef / 100);

    // ── Output DOM ──
    $('pension-result').textContent       = fmtK(fpNet);
    $('pension-label').textContent        = `Capitale netto finale stimato`;
    $('d-pension-monthly').textContent    = fmtEur(monthlyFP);
    $('d-pension-yearly-fund').textContent = fmtEur(versatoFPAnno);
    $('d-pension-yearly-dip').textContent  = fmtEur(contribDipAnno);
    $('d-pension-yearly-az').textContent   = fmtEur(contribAzAnno);
    $('d-pension-prest').textContent      = (prestRate * 100).toFixed(1).replace('.0','') + '%';
    $('d-pension-prest-note').textContent = years <= 15
        ? `15% fino a 15 anni di adesione`
        : `15% − 0,3% per ogni anno oltre 15 (min 9%)`;

    // Confronto FP vs TFR azienda
    $('pension-tfr-net').textContent = fmtK(tfrNet);
    $('pension-fp-net').textContent  = fmtK(fpNet);
    const delta = fpNet - tfrNet;
    const deltaEl = $('pension-delta');
    if (Math.abs(delta) < 1) {
        deltaEl.textContent = 'Le due strategie sono equivalenti';
        deltaEl.style.color = 'var(--muted)';
    } else if (delta > 0) {
        deltaEl.textContent = `+${fmtK(delta)} con il fondo pensione`;
        deltaEl.style.color = 'var(--purple)';
    } else {
        deltaEl.textContent = `+${fmtK(-delta)} lasciando in azienda`;
        deltaEl.style.color = 'var(--muted)';
    }

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

    RESULTS.pension = { net: fpNet, paid: versatoFPTot, years, series: dataFP };
    setChart('pension', labels, dataFP);
}
