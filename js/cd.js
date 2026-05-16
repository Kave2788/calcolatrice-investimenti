function calcCD() {
    const initial    = gn('cd-initial');
    const monthlyAdd = gn('cd-monthly-add');
    const years      = gi('cd-years');
    const rate       = gn('cd-rate');
    const taxRate    = gn('cd-tax');
    const yr0        = new Date().getFullYear();

    const labels = [], data = [];
    let capital = initial;
    let totalInterestGross = 0;
    let totalBollo = 0;
    let totalAdded = 0;

    labels.push('Oggi');
    data.push(Math.round(capital));

    for (let y = 1; y <= years; y++) {
        capital += monthlyAdd * 12;
        totalAdded += monthlyAdd * 12;
        const interest = capital * (rate / 100);
        totalInterestGross += interest;
        capital += interest;
        totalBollo += capital * 0.002;
        const showLabel = y === years || (years > 10 ? y % 5 === 0 : y % 2 === 0);
        labels.push(showLabel ? (yr0 + y) : '');
        data.push(Math.round(capital));
    }

    const interestTax = totalInterestGross * (taxRate / 100);
    const net     = capital - interestTax - totalBollo;
    const totalIn = initial + totalAdded;
    const gainRatio = totalIn > 0 ? (net - totalIn) / totalIn : 0;

    $('cd-label').textContent  = `Capitale stimato tra ${years} anni`;
    $('cd-result').textContent = fmtK(net);
    $('cd-badge').textContent  = rating(gainRatio);
    $('d-cd-initial').textContent  = fmtEur(initial);
    $('d-cd-monthly').textContent  = fmtEur(monthlyAdd);
    $('d-cd-years').textContent    = years + ' anni';
    $('d-cd-rate').textContent     = fmtPct(rate);
    $('d-cd-tax').textContent      = Math.round(taxRate) + '%';

    const netGain = Math.max(0, net - totalIn);
    $('cd-tip').textContent = netGain > 0
        ? `Con ${fmtEur(initial)} iniziali e ${fmtEur(monthlyAdd)}/mese guadagni ${fmtK(netGain)} netti in ${years} anni.`
        : 'La scelta più sicura per far crescere i tuoi risparmi in modo semplice.';

    RESULTS.cd = { net, paid: totalIn, years, series: data };
    setChart('cd', labels, data);
}
