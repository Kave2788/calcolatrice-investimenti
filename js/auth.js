const SUPABASE_URL = 'https://xnwfajifsbveqotwkyxl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iD6vepSi4gYSHcT4Ar26cg_vwZrVDp3';

const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let _saveTimer = null;

async function authInit() {
    const { data: { session } } = await _sb.auth.getSession();
    _updateAuthUI(session?.user ?? null);
    if (session?.user) await _loadCloud();

    _sb.auth.onAuthStateChange(async (event, session) => {
        _updateAuthUI(session?.user ?? null);
        if (event === 'SIGNED_IN') await _loadCloud();
    });
}

function _updateAuthUI(user) {
    const el = $('auth-status');
    if (!el) return;
    if (user) {
        el.innerHTML = `<span class="auth-email">${user.email}</span><button class="auth-signout" onclick="authSignOut()">Esci</button>`;
    } else {
        el.innerHTML = `<button class="auth-login" onclick="showAuthModal()">Accedi / Registrati</button>`;
    }
}

async function authSignOut() {
    await _sb.auth.signOut();
}

async function _loadCloud() {
    const { data: { user } } = await _sb.auth.getUser();
    if (!user) return;
    const { data } = await _sb.from('user_params').select('params,bonds').eq('id', user.id).single();
    if (!data) return;

    if (data.params) {
        Object.entries(data.params).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        });
    }
    if (Array.isArray(data.bonds) && data.bonds.length > 0) {
        BONDS = data.bonds;
        renderBonds();
    }
    updateAll();
    _showSyncBadge('Dati caricati');
}

async function _saveCloud() {
    const { data: { user } } = await _sb.auth.getUser();
    if (!user) return;

    const params = {};
    document.querySelectorAll('input[type=number], input[type=text]').forEach(el => {
        if (el.id) params[el.id] = el.value;
    });
    ['s-fund-type', 's-fund-name', 's-fund-comparto'].forEach(id => {
        const el = document.getElementById(id);
        if (el) params[id] = el.value;
    });

    await _sb.from('user_params').upsert({
        id: user.id,
        params,
        bonds: BONDS,
        updated_at: new Date().toISOString()
    });
    _showSyncBadge('Salvato');
}

function saveToCloud() {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(_saveCloud, 1500);
}

function _showSyncBadge(msg) {
    const el = $('sync-badge');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 2000);
}

// ── MODAL ──
function showAuthModal() {
    $('auth-modal').style.display = 'flex';
    $('auth-email').focus();
}

function hideAuthModal() {
    $('auth-modal').style.display = 'none';
    $('auth-error').textContent = '';
}

async function submitAuth(mode) {
    const email    = $('auth-email').value.trim();
    const password = $('auth-password').value;
    const errEl    = $('auth-error');
    errEl.textContent = '';

    if (!email || !password) { errEl.textContent = 'Inserisci email e password.'; return; }

    try {
        if (mode === 'signin') {
            const { error } = await _sb.auth.signInWithPassword({ email, password });
            if (error) throw error;
            hideAuthModal();
        } else {
            const { error } = await _sb.auth.signUp({ email, password });
            if (error) throw error;
            errEl.style.color = '#10B981';
            errEl.textContent = 'Registrazione ok! Controlla la tua email per confermare.';
        }
    } catch(e) {
        errEl.style.color = '#F87171';
        errEl.textContent = e.message;
    }
}
