// Imposta di bollo sui prodotti finanziari: 0,20% annuo sul controvalore
// (dossier titoli / ETF), addebitata di fatto ogni anno. Qui mensilizzata.
const PAC_BOLLO_RATE = 0.002;

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

    let capital  = initial;
    let bolloTot = 0;
    for (let m = 0; m < years * 12; m++) {
        capital = capital * (1 + rateM) + monthly;
        const bollo = capital * (PAC_BOLLO_RATE / 12);
        bolloTot += bollo;
        capital  -= bollo;   // il bollo esce dal controvalore, non riduce la plusvalenza tassabile
    }

    const totalPaid = initial + monthly * 12 * years;
    // Il capital gain si calcola al lordo del bollo (che è un'imposta patrimoniale a sé)
    const gainGross = Math.max(0, capital + bolloTot - totalPaid);
    const capGainTax = gainGross * (taxRate / 100);
    const taxes     = capGainTax + bolloTot;
    const net       = capital - capGainTax;
    const gainNet   = Math.max(0, net - totalPaid);

    animateNumber($('pac-result'), net, fmtK);
    $('d-pac-paid').textContent       = fmtEur(totalPaid);
    $('d-pac-gain-gross').textContent = fmtEur(gainGross);
    $('d-pac-taxes').textContent      = fmtEur(taxes);
    $('d-pac-taxes-sub').textContent  = `capital gain ${fmtEur(capGainTax)} + bollo ${fmtEur(bolloTot)}`;
    $('d-pac-gain-net').textContent   = fmtEur(gainNet);

    $('pac-tip').textContent = gainNet > 0
        ? `Stai trasformando ${fmtEur(totalPaid)} in ${fmtK(net)}, guadagnando ${fmtK(gainNet)} netti in ${years} anni.`
        : 'Con un piccolo investimento costante, il tempo è il tuo miglior alleato.';

    RESULTS.pac = { net, paid: totalPaid, years };
}
