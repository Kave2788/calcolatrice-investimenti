// ── TAB SWITCHING ──
const NAV_COLOR = { home: 'gold', pension: 'purple', pac: 'green', cd: 'blue', settings: 'neutral' };

function switchTab(tab) {
    ['home','pension','pac','cd','settings'].forEach(t => {
        $('view-' + t).classList.remove('active');
        const nb = $('nav-' + t);
        nb.classList.remove('active','gold','purple','green','blue','neutral');
    });
    $('view-' + tab).classList.add('active');
    $('nav-' + tab).classList.add('active', NAV_COLOR[tab]);
}

// ── EDIT TOGGLE ──
const editOpen = {};

function toggleEdit(key) {
    editOpen[key] = !editOpen[key];
    const grid    = $(key + '-edit');
    const display = $(key + '-display');
    const btn     = grid.previousElementSibling.querySelector('.edit-btn');
    if (editOpen[key]) {
        grid.classList.add('open');
        display.style.display = 'none';
        btn.textContent = 'Chiudi';
    } else {
        grid.classList.remove('open');
        display.style.display = '';
        btn.textContent = 'Modifica';
    }
}

// ── INFLATION SYNC ──
function syncInflation(sourceId) {
    const v = gn(sourceId);
    ['pension-inflation','pac-inflation','s-inflation'].forEach(id => {
        if ($(id) && id !== sourceId) $(id).value = v;
    });
    updateAll();
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
    initCharts();
    initFundSelector();
    restoreFundSelector();
    updateAll();

    document.addEventListener('input', saveState);
    document.addEventListener('change', saveState);
});
