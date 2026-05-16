function calcPAC() {
    const initial  = gn('pac-initial');
    const monthly  = gn('pac-monthly');
    const years    = gi('pac-years');
    const rate     = gn('pac-rate');
    const taxRate  = gn('pac-tax');
    const infl     = gn('pac-inflation');
    const rateM    = (rate / 100) / 12;
    const yr0      = new Date().getFullYear();

    const labels = [], data = [];
    let capital = initial;

    labels.push('Oggi');
    data.push(Math.round(capital));

    for (let y = 1; y <= years; y++) {
        for (let m = 0; m < 12; m++) {
            capital = capital * (1 + rateM) + monthly;
        }
        const showLabel = y === years || (years > 10 ? y % 10 === 0 : y % 5 === 0);
        labels.push(showLabel ? (yr0 + y) : '');
        data.push(Math.round(capital));
    }

    const totalPaid = initial + monthly * 12 * years;
    const gain      = Math.max(0, capital - totalPaid);
    const taxes     = gain * (taxRate / 100);
    const net       = capital - taxes;
    const gainRatio = totalPaid > 0 ? (net - totalPaid) / totalPaid : 0;

    $('pac-label').textContent     = `Capitale stimato tra ${years} anni`;
    $('pac-result').textContent    = fmtK(net);
    $('pac-badge').textContent     = rating(gainRatio);
    $('d-pac-initial').textContent  = fmtEur(initial);
    $('d-pac-monthly').textContent  = fmtEur(monthly);
    $('d-pac-years').textContent    = years + ' anni';
    $('d-pac-rate').textContent     = fmtPct(rate);
    $('d-pac-inflation').textContent = fmtPct(infl);

    const netGain = Math.max(0, net - totalPaid);
    $('pac-tip').textContent = netGain > 0
        ? `Stai trasformando ${fmtEur(totalPaid)} in ${fmtK(net)}, guadagnando ${fmtK(netGain)} di interessi netti in ${years} anni.`
        : 'Con un piccolo investimento costante, il tempo è il tuo miglior alleato.';

    RESULTS.pac = { net, paid: totalPaid, years, series: data };
    setChart('pac', labels, data);
}
