function calcHome() {
    const p = RESULTS.pension;
    const a = RESULTS.pac;
    const c = RESULTS.cd;

    animateNumber($('home-total'), p.net + a.net + c.net, fmtK);
    animateNumber($('home-pension-val'), p.net, fmtK);
    animateNumber($('home-pac-val'), a.net, fmtK);
    animateNumber($('home-cd-val'), c.net, fmtK);
}
