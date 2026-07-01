function calcHome() {
    const p = RESULTS.pension;
    const a = RESULTS.pac;
    const c = RESULTS.cd;

    $('home-total').textContent       = fmtK(p.net + a.net + c.net);
    $('home-pension-val').textContent = fmtK(p.net);
    $('home-pac-val').textContent     = fmtK(a.net);
    $('home-cd-val').textContent      = fmtK(c.net);
}
