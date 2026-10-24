// Selettore e lettori di input
const $  = id => document.getElementById(id);
const gn = id => { const v = parseFloat($(id)?.value); return isNaN(v) ? 0 : v; };
const gi = id => { const v = parseInt($(id)?.value);   return isNaN(v) ? 0 : v; };

// Formattatori
// useGrouping 'always': separatore anche sotto 10.000 (€ 3.293, non € 3293)
const NUM_FMT = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0, useGrouping: 'always' });
// Spazio non separabile dopo €: il simbolo non va mai a capo da solo
const fmtK   = v => '€\u00A0' + NUM_FMT.format(Math.round(v || 0));
const fmtEur = v => '€\u00A0' + NUM_FMT.format(v || 0);

// Stato condiviso tra i moduli di calcolo
const RESULTS = {
    pension: { net: 0, paid: 0, years: 0 },
    pac:     { net: 0, paid: 0, years: 0 },
    cd:      { net: 0, paid: 0, years: 0 }
};

// Anima un valore numerico verso il nuovo target (count-up), cancellando l'animazione precedente
// per restare fluido anche con input rapidi. Rispetta "riduci movimento" del sistema.
const REDUCED_MOTION = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function animateNumber(el, newVal, fmt, duration = 450) {
    if (!el) return;
    const prev = el.dataset.val !== undefined ? parseFloat(el.dataset.val) : newVal;
    el.dataset.val = newVal;
    if (el._animRAF) cancelAnimationFrame(el._animRAF);
    if (REDUCED_MOTION || !Number.isFinite(prev) || Math.abs(prev - newVal) < 0.5) { el.textContent = fmt(newVal); return; }
    const start = performance.now();
    const step = now => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = fmt(prev + (newVal - prev) * eased);
        if (t < 1) el._animRAF = requestAnimationFrame(step);
    };
    el._animRAF = requestAnimationFrame(step);
}


// Colonna "rendimenti" della pillola ricavata dalle altre già arrotondate all'euro,
// così versato + rendimenti − tasse coincide sempre con il totale mostrato
const pillReturns = (net, paid, taxes) => Math.round(net) - Math.round(paid) + Math.round(taxes);

// ── POTERE D'ACQUISTO ──
// Inflazione unica per tutta l'app (campo nella tab TFR, default 2%)
const DEFAULT_INFLATION = 2;
// Campo vuoto → default; 0% è un valore valido (non va confuso col vuoto)
const getInflation = () => { const v = parseFloat($('s-inflation')?.value); return isNaN(v) ? DEFAULT_INFLATION : v; };

// Valore reale in euro di oggi: nominale / (1 + inflazione)^anni
const realValue = (nominal, years, inflPct) => nominal / Math.pow(1 + inflPct / 100, Math.max(0, years));

// Riga "≈ € X in euro di oggi" sotto la result card della tab
function renderReal(prefix, nominal, years) {
    const el = $(prefix + '-real');
    if (!el) return;
    const infl = getInflation();
    el.textContent = nominal > 0 && years > 0
        ? `≈ ${fmtK(realValue(nominal, years, infl))} in euro di oggi · inflazione ${String(infl).replace('.', ',')}%`
        : '';
}
