// Selettore e lettori di input
const $  = id => document.getElementById(id);
const gn = id => { const v = parseFloat($(id)?.value); return isNaN(v) ? 0 : v; };
const gi = id => { const v = parseInt($(id)?.value);   return isNaN(v) ? 0 : v; };

// Formattatori
const fmtK   = v => '€ ' + new Intl.NumberFormat('it-IT').format(Math.round(v || 0));
const fmtPct = v => (v || 0).toFixed(1).replace('.', ',') + '%';
const fmtEur = v => '€ ' + new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 }).format(v || 0);

// Stato condiviso tra i moduli di calcolo
const RESULTS = {
    pension: { net: 0, paid: 0, years: 0, series: [] },
    pac:     { net: 0, paid: 0, years: 0, series: [] },
    cd:      { net: 0, paid: 0, years: 0, series: [] }
};

