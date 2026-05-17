function calcPAC() {
    const monthly = gn('pac-monthly');
    const years   = gi('pac-years');
    const rate    = gn('pac-rate');
    const ter     = gn('pac-ter');
    const taxRate = gn('pac-tax');
    // Rendimento netto dei costi ETF (TER deducibile annualmente, qui mensilizzato)
    const rateNet = Math.max(0, rate - ter);
    const rateM   = (rateNet / 100) / 12;
    const yr0     = new Date().getFullYear();

    const labels = [], data = [];
    let capital = 0;

    labels.push('Oggi');
    data.push(0);

    for (let y = 1; y <= years; y++) {
        for (let m = 0; m < 12; m++) {
            capital = capital * (1 + rateM) + monthly;
        }
        const showLabel = y === years || (years > 10 ? y % 10 === 0 : y % 5 === 0);
        labels.push(showLabel ? (yr0 + y) : '');
        data.push(Math.round(capital));
    }

    const totalPaid = monthly * 12 * years;
    const gainGross = Math.max(0, capital - totalPaid);
    const taxes     = gainGross * (taxRate / 100);
    const net       = capital - taxes;
    const gainNet   = Math.max(0, net - totalPaid);

    $('pac-label').textContent     = `Capitale netto stimato`;
    $('pac-result').textContent    = fmtK(net);
    $('d-pac-paid').textContent       = fmtEur(totalPaid);
    $('d-pac-gain-gross').textContent = fmtEur(gainGross);
    $('d-pac-taxes').textContent      = fmtEur(taxes);
    $('d-pac-gain-net').textContent   = fmtEur(gainNet);

    $('pac-tip').textContent = gainNet > 0
        ? `Stai trasformando ${fmtEur(totalPaid)} in ${fmtK(net)}, guadagnando ${fmtK(gainNet)} netti in ${years} anni.`
        : 'Con un piccolo investimento costante, il tempo è il tuo miglior alleato.';

    RESULTS.pac = { net, paid: totalPaid, years, series: data };
    setChart('pac', labels, data);
}
