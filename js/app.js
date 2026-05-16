// ── TAB SWITCHING ──
const NAV_COLOR = { pension: 'purple', pac: 'green', cd: 'blue', settings: 'neutral' };

function switchTab(tab) {
    ['pension','pac','cd','settings'].forEach(t => {
        $('view-' + t).classList.remove('active');
        const nb = $('nav-' + t);
        nb.classList.remove('active','purple','green','blue','neutral');
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
}

// ── INIT ──
window.addEventListener('DOMContentLoaded', () => {
    initCharts();
    initFundSelector();
    updateAll();
});
