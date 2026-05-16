function calcPension() {
    const age       = gi('pension-age');
    const retire    = gi('pension-retire');
    const rateGross = gn('pension-rate');
    const costs     = gn('pension-costs');
    const taxRate   = gn('pension-tax');
    const infl      = gn('pension-inflation');

    const ral    = gn('s-ral');
    const pctDip = gn('s-emp-pct');
    const pctAz  = gn('s-comp-pct');
    const pctTFR = gn('s-tfr-pct');
    if (ral > 0) {
        const contribDip = (ral / 12) * (pctDip / 100);
        const contribAz  = (ral / 12) * (pctAz  / 100);
        const contribTFR = (ral / 13.5 / 12) * (pctTFR / 100);
        $('pension-monthly').value = Math.round(contribDip + contribAz + contribTFR);
    }
    const monthly = gn('pension-monthly');

    const years   = Math.max(0, retire - age);
    const rateNet = Math.max(0, rateGross - costs) / 100;
    const yr0     = new Date().getFullYear();

    const labels = [], data = [];
    let capital = 0;

    for (let y = 0; y <= years; y++) {
        const showLabel = y === 0 || y === years || (years > 10 ? y % 10 === 0 : y % 5 === 0);
        labels.push(showLabel ? (y === 0 ? 'Oggi' : yr0 + y) : '');
        data.push(Math.round(capital));
        if (y < years) capital = capital * (1 + rateNet) + monthly * 12;
    }

    const totalPaid = monthly * 12 * years;
    const gain      = capital - totalPaid;
    const taxes     = Math.max(0, gain * (taxRate / 100));
    const net       = capital - taxes;
    const gainRatio = totalPaid > 0 ? (net - totalPaid) / totalPaid : 0;

    $('pension-label').textContent    = `Capitale stimato a ${retire} anni`;
    $('pension-result').textContent   = fmtK(net);
    $('pension-badge').textContent    = rating(gainRatio);
    $('d-pension-age').textContent    = age + ' anni';
    $('d-pension-retire').textContent = retire + ' anni';
    $('d-pension-monthly').textContent = fmtEur(monthly);
    $('d-pension-rate').textContent   = fmtPct(rateGross);
    $('d-pension-inflation').textContent = fmtPct(infl);

    const monthlyIncome = net / (12 * 20);
    $('pension-tip').textContent = monthlyIncome > 0
        ? `Con questi parametri potresti avere un reddito aggiuntivo di circa ${fmtEur(monthlyIncome)} al mese per i primi 20 anni di pensione.`
        : 'Inserisci i tuoi parametri per scoprire il tuo futuro finanziario.';

    setChart('pension', labels, data);
}
