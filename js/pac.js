function calcPAC() {
    const monthly = gn('pac-monthly');
    const years   = gi('pac-years');
    const rate    = gn('pac-rate');
    const ter     = gn('pac-ter');
    const taxRate = gn('pac-tax');
    // Rendimento netto dei costi ETF (TER deducibile annualmente, qui mensilizzato)
    const rateNet = Math.max(0, rate - ter);
    const rateM   = (rateNet / 100) / 12;
    const initial = gn('pac-initial');

    let capital = initial;
    for (let m = 0; m < years * 12; m++) {
        capital = capital * (1 + rateM) + monthly;
    }

    const totalPaid = initial + monthly * 12 * years;
    const gainGross = Math.max(0, capital - totalPaid);
    const taxes     = gainGross * (taxRate / 100);
    const net       = capital - taxes;
    const gainNet   = Math.max(0, net - totalPaid);

    $('pac-result').textContent    = fmtK(net);
    $('d-pac-paid').textContent       = fmtEur(totalPaid);
    $('d-pac-gain-gross').textContent = fmtEur(gainGross);
    $('d-pac-taxes').textContent      = fmtEur(taxes);
    $('d-pac-gain-net').textContent   = fmtEur(gainNet);

    $('pac-tip').textContent = gainNet > 0
        ? `Stai trasformando ${fmtEur(totalPaid)} in ${fmtK(net)}, guadagnando ${fmtK(gainNet)} netti in ${years} anni.`
        : 'Con un piccolo investimento costante, il tempo è il tuo miglior alleato.';

    RESULTS.pac = { net, paid: totalPaid, years };
}
