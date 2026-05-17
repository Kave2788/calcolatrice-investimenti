// ── TAB SWITCHING ──
const NAV_COLOR = { home: 'gold', pension: 'purple', pac: 'green', cd: 'blue' };

function switchTab(tab) {
    ['home','pension','pac','cd'].forEach(t => {
        $('view-' + t).classList.remove('active');
        const nb = $('nav-' + t);
        nb.classList.remove('active','gold','purple','green','blue');
    });
    $('view-' + tab).classList.add('active');
    $('nav-' + tab).classList.add('active', NAV_COLOR[tab]);
}

// ── ORCHESTRATORE ──
function updateAll() {
    calcPension();
    calcPAC();
    calcCD();
    calcHome();
}

// ── PERSISTENZA ──
const SAVE_KEY = 'calc-state';

function saveState() {
    const state = {};
    document.querySelectorAll('input[type=number]').forEach(el => {
        if (el.id) state[el.id] = el.value;
    });
    ['s-fund-type', 's-fund-name', 's-fund-comparto'].forEach(id => {
        const el = $(id);
        if (el) state[id] = el.value;
    });
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function loadState() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; }
    catch(e) { return {}; }
}

function restoreInputs() {
    const state = loadState();
    document.querySelectorAll('input[type=number]').forEach(el => {
        if (el.id && state[el.id] !== undefined) el.value = state[el.id];
    });
}

function restoreFundSelector() {
    const state = loadState();
    const tipo = state['s-fund-type'];
    if (!tipo || tipo === 'custom') return;

    $('s-fund-type').value = tipo;
    populateFundNames(tipo);
    $('s-fund-name-row').style.display = 'flex';

    const fundName = state['s-fund-name'];
    if (!fundName) return;
    $('s-fund-name').value = fundName;

    populateComparti(tipo, fundName);
    $('s-fund-comparto-row').style.display = 'flex';

    const compIdx = state['s-fund-comparto'];
    if (compIdx !== undefined && compIdx !== '') {
        $('s-fund-comparto').value = compIdx;
        applyISC(tipo, fundName, parseInt(compIdx));
    }
}

// ── INIT ──
window.addEventListener('DOMContentLoaded', () => {
    restoreInputs();
    loadBonds();
    renderBonds();
    initCharts();
    initFundSelector();
    restoreFundSelector();
    updateAll();

    document.addEventListener('input', saveState);
    document.addEventListener('change', saveState);
});
