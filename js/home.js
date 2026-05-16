function calcHome() {
    const p = RESULTS.pension;
    const a = RESULTS.pac;
    const c = RESULTS.cd;

    const total     = p.net + a.net + c.net;
    const totalPaid = p.paid + a.paid + c.paid;
    const gainRatio = totalPaid > 0 ? (total - totalPaid) / totalPaid : 0;

    $('home-total').textContent = fmtK(total);
    $('home-badge').textContent = total > 0 ? rating(gainRatio) : '—';

    const yr0 = new Date().getFullYear();
    $('home-pension-val').textContent = fmtK(p.net);
    $('home-pension-sub').textContent = p.years > 0 ? `a ${yr0 + p.years}` : '—';
    $('home-pac-val').textContent     = fmtK(a.net);
    $('home-pac-sub').textContent     = a.years > 0 ? `tra ${a.years} anni` : '—';
    $('home-cd-val').textContent      = fmtK(c.net);
    $('home-cd-sub').textContent      = c.years > 0 ? `tra ${c.years} anni` : '—';

    const maxYrs = Math.max(p.years, a.years, c.years, 1);
    const labels = [], totalData = [];
    for (let y = 0; y <= maxYrs; y++) {
        const show = y === 0 || y === maxYrs || (maxYrs > 10 ? y % 10 === 0 : y % 5 === 0);
        labels.push(show ? (y === 0 ? 'Oggi' : yr0 + y) : '');
        const pv = y < p.series.length ? p.series[y] : p.net;
        const av = y < a.series.length ? a.series[y] : a.net;
        const cv = y < c.series.length ? c.series[y] : c.net;
        totalData.push(pv + av + cv);
    }

    setChart('home', labels, totalData);
}
