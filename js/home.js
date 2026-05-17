function calcHome() {
    const p = RESULTS.pension;
    const a = RESULTS.pac;
    const c = RESULTS.cd;

    $('home-total').textContent       = fmtK(p.net + a.net + c.net);
    $('home-pension-val').textContent = fmtK(p.net);
    $('home-pac-val').textContent     = fmtK(a.net);
    $('home-cd-val').textContent      = fmtK(c.net);

    const yr0    = new Date().getFullYear();
    const maxYrs = Math.max(p.years, a.years, c.years, 1);

    // Le serie di TFR e PAC sono annuali; quella del CD è MENSILE → campiona ogni 12 mesi
    const samplePension = y => y < p.series.length ? p.series[y] : p.net;
    const samplePac     = y => y < a.series.length ? a.series[y] : a.net;
    const sampleCd      = y => {
        const idx = y * 12;
        return idx < c.series.length ? c.series[idx] : c.net;
    };

    const labels  = [];
    const dataTFR = [];
    const dataPAC = [];
    const dataCD  = [];
    for (let y = 0; y <= maxYrs; y++) {
        const show = y === 0 || y === maxYrs || (maxYrs > 10 ? y % 10 === 0 : y % 5 === 0);
        labels.push(show ? (y === 0 ? 'Oggi' : yr0 + y) : '');
        dataTFR.push(samplePension(y));
        dataPAC.push(samplePac(y));
        dataCD.push(sampleCd(y));
    }

    setChartMulti('home', labels, [dataTFR, dataPAC, dataCD]);
}
