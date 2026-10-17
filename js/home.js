// Durata leggibile: "6 mesi", "1 anno", "2,5 anni"
function durationText(years) {
    const months = Math.max(1, Math.round(years * 12));
    if (months < 12) return `${months} mesi`;
    const y = Math.round(months / 12 * 10) / 10;
    return `${String(y).replace('.', ',')} ${y === 1 ? 'anno' : 'anni'}`;
}

// Sottotitolo di ogni strumento nella lista della Home
function homeSubtitles(p, a, c) {
    const bonds = typeof BONDS !== 'undefined' ? BONDS.length : 0;   // vincoli del conto deposito (cd.js)
    return {
        pension: p.net > 0 ? `${p.years} anni · ≈ ${fmtEur(p.monthlyIncome || 0)}/mese` : 'Da configurare',
        pac:     a.net > 0 ? `${a.years} anni · ${fmtEur(a.monthly || 0)}/mese` : 'Da configurare',
        cd:      bonds > 0 ? `${bonds} ${bonds === 1 ? 'vincolo' : 'vincoli'} · fino a ${durationText(c.years)}` : 'Nessun vincolo'
    };
}

function calcHome() {
    const p = RESULTS.pension;
    const a = RESULTS.pac;
    const c = RESULTS.cd;

    const total = p.net + a.net + c.net;
    const paid  = p.paid + a.paid + c.paid;
    const gain  = Math.max(0, total - paid);
    // Ogni strumento ha il suo orizzonte: il valore reale si sconta strumento per strumento
    const infl  = getInflation();
    const real  = [p, a, c].reduce((sum, r) => sum + realValue(r.net, r.years, infl), 0);

    animateNumber($('home-total'), total, fmtK);
    animateNumber($('home-pension-val'), p.net, fmtK);
    animateNumber($('home-pac-val'), a.net, fmtK);
    animateNumber($('home-cd-val'), c.net, fmtK);

    // Pillola: versato + guadagno netto = patrimonio
    $('home-paid').textContent  = fmtEur(paid);
    $('home-gain').textContent  = fmtEur(gain);
    $('home-yield').textContent = paid > 0 ? `+${Math.round(gain / paid * 100)}%` : '—';
    $('home-real').textContent  = total > 0
        ? `≈ ${fmtK(real)} in euro di oggi · inflazione ${String(infl).replace('.', ',')}%`
        : '';

    const subs = homeSubtitles(p, a, c);
    $('home-pension-sub').textContent = subs.pension;
    $('home-pac-sub').textContent     = subs.pac;
    $('home-cd-sub').textContent      = subs.cd;
}
