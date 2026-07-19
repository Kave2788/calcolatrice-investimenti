// Selettore e lettori di input
const $  = id => document.getElementById(id);
const gn = id => { const v = parseFloat($(id)?.value); return isNaN(v) ? 0 : v; };
const gi = id => { const v = parseInt($(id)?.value);   return isNaN(v) ? 0 : v; };

// Formattatori
const fmtK   = v => '€ ' + new Intl.NumberFormat('it-IT').format(Math.round(v || 0));
const fmtEur = v => '€ ' + new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 }).format(v || 0);

// Stato condiviso tra i moduli di calcolo
const RESULTS = {
    pension: { net: 0, paid: 0, years: 0 },
    pac:     { net: 0, paid: 0, years: 0 },
    cd:      { net: 0, paid: 0, years: 0 }
};

// Anima un valore numerico verso il nuovo target (count-up), cancellando l'animazione precedente
// per restare fluido anche con input rapidi
function animateNumber(el, newVal, fmt, duration = 450) {
    if (!el) return;
    const prev = el.dataset.val !== undefined ? parseFloat(el.dataset.val) : newVal;
    el.dataset.val = newVal;
    if (el._animRAF) cancelAnimationFrame(el._animRAF);
    if (!Number.isFinite(prev) || Math.abs(prev - newVal) < 0.5) { el.textContent = fmt(newVal); return; }
    const start = performance.now();
    const step = now => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = fmt(prev + (newVal - prev) * eased);
        if (t < 1) el._animRAF = requestAnimationFrame(step);
    };
    el._animRAF = requestAnimationFrame(step);
}

