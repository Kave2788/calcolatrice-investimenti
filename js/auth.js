const SUPABASE_URL = 'https://xnwfajifsbveqotwkyxl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iD6vepSi4gYSHcT4Ar26cg_vwZrVDp3';

const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let _saveTimer = null;
let _recovering = false;   // true mentre l'utente sta reimpostando la password dal link email

const _esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

async function authInit() {
    // Il link di recupero torna con #type=recovery: intercettalo prima di tutto
    _recovering = /[#&]type=recovery/.test(location.hash);

    const { data: { session } } = await _sb.auth.getSession();
    _updateAuthUI(session?.user ?? null);
    if (session?.user && !_recovering) await _loadCloud();

    _sb.auth.onAuthStateChange(async (event, session) => {
        _updateAuthUI(session?.user ?? null);
        if (event === 'PASSWORD_RECOVERY') {
            _recovering = true;
            showNewPasswordForm();
            return;
        }
        if (event === 'SIGNED_IN' && !_recovering) await _loadCloud();
    });

    if (_recovering) {
        history.replaceState(null, '', location.pathname + location.search);
        showNewPasswordForm();
    }
}

function _updateAuthUI(user) {
    const el = $('auth-status');
    if (!el) return;
    if (user) {
        el.innerHTML = `
            <span class="auth-email">${_esc(user.email)}</span>
            <button class="auth-icon-btn logged-in" onclick="showAuthModal()" title="Account">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>`;
    } else {
        el.innerHTML = `
            <button class="auth-icon-btn" onclick="showAuthModal()" title="Accedi">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>`;
    }
}

async function authSignOut() {
    await _sb.auth.signOut();
}

async function _loadCloud() {
    try {
        const { data: { user } } = await _sb.auth.getUser();
        if (!user) return;
        const { data, error } = await _sb.from('user_params').select('params,bonds').eq('id', user.id).maybeSingle();
        if (error) throw error;

        // Cloud vuoto per questo utente (primo login, o compilato da sloggato):
        // fai il seed dai valori già presenti localmente invece di non far nulla.
        const cloudEmpty = !data || (data.params == null && !(Array.isArray(data.bonds) && data.bonds.length > 0));
        if (cloudEmpty) { await _saveCloud(); return; }

        if (data.params) {
            // I select del fondo COVIP vanno ripristinati dopo aver popolato le option
            const fundIds = ['s-fund-type', 's-fund-name', 's-fund-comparto'];
            Object.entries(data.params).forEach(([id, val]) => {
                if (fundIds.includes(id)) return;
                const el = document.getElementById(id);
                if (el) el.value = val;
            });
            restoreFundSelector(data.params);
        }
        if (Array.isArray(data.bonds) && data.bonds.length > 0) {
            BONDS = data.bonds;
            renderBonds();
        }
        updateAll();
        _showSyncBadge('Dati caricati');
    } catch (e) {
        _showSyncBadge('Caricamento fallito', true);
    }
}

async function _saveCloud() {
    try {
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

        const { error } = await _sb.from('user_params').upsert({
            id: user.id,
            params,
            bonds: BONDS,
            updated_at: new Date().toISOString()
        });
        if (error) throw error;
        _showSyncBadge('Salvato');
    } catch (e) {
        _showSyncBadge('Salvataggio fallito', true);
    }
}

function saveToCloud() {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(_saveCloud, 1500);
}

// Forza subito il salvataggio pendente (senza attendere il debounce): usato
// quando l'app va in background o viene chiusa, per non perdere le ultime
// modifiche compilate a ridosso della chiusura.
function flushCloudSave() {
    clearTimeout(_saveTimer);
    _saveTimer = null;
    _saveCloud();
}

function _showSyncBadge(msg, isError = false) {
    const el = $('sync-badge');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('error', isError);
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 2000);
}

// ── MODAL ──
async function showAuthModal() {
    const { data: { user } } = await _sb.auth.getUser();
    if (user) {
        $('auth-modal-content').innerHTML = `
            <button class="auth-close" onclick="hideAuthModal()">✕</button>
            <h2 class="auth-title">Account</h2>
            <p class="auth-sub" style="word-break:break-all">${_esc(user.email)}</p>
            <p class="auth-sub">I tuoi parametri vengono salvati automaticamente.</p>
            <button class="auth-btn-primary" style="width:100%;margin-top:8px" onclick="authSignOut();hideAuthModal()">Esci</button>`;
    } else {
        $('auth-modal-content').innerHTML = `
            <button class="auth-close" onclick="hideAuthModal()">✕</button>
            <h2 class="auth-title">Il tuo account</h2>
            <p class="auth-sub">Accedi per salvare i parametri su qualsiasi dispositivo.</p>
            <input id="auth-email"    type="email"    placeholder="Email"    class="auth-input">
            <input id="auth-password" type="password" placeholder="Password" class="auth-input" onkeydown="if(event.key==='Enter')submitAuth('signin')">
            <div id="auth-error" class="auth-error"></div>
            <div class="auth-actions">
                <button class="auth-btn-primary"   onclick="submitAuth('signin')">Accedi</button>
                <button class="auth-btn-secondary" onclick="submitAuth('signup')">Registrati</button>
            </div>
            <button class="auth-link" onclick="showResetForm()">Password dimenticata?</button>`;
        setTimeout(() => $('auth-email')?.focus(), 50);
    }
    $('auth-modal').style.display = 'flex';
}

// Form di richiesta reset: invia il link di recupero all'email indicata
function showResetForm(prefill = '') {
    $('auth-modal-content').innerHTML = `
        <button class="auth-close" onclick="hideAuthModal()">✕</button>
        <h2 class="auth-title">Recupera password</h2>
        <p class="auth-sub">Ti inviamo un link per impostare una nuova password.</p>
        <input id="auth-email" type="email" placeholder="Email" class="auth-input"
               value="${_esc(prefill)}" onkeydown="if(event.key==='Enter')submitReset()">
        <div id="auth-error" class="auth-error"></div>
        <div class="auth-actions">
            <button class="auth-btn-primary" onclick="submitReset()">Invia link</button>
            <button class="auth-btn-secondary" onclick="showAuthModal()">Indietro</button>
        </div>`;
    $('auth-modal').style.display = 'flex';
    setTimeout(() => $('auth-email')?.focus(), 50);
}

async function submitReset() {
    const email = $('auth-email')?.value.trim();
    const errEl = $('auth-error');
    if (errEl) errEl.textContent = '';
    if (!email) { if (errEl) errEl.textContent = 'Inserisci la tua email.'; return; }

    try {
        // redirectTo riporta sull'app: al ritorno Supabase emette PASSWORD_RECOVERY
        const { error } = await _sb.auth.resetPasswordForEmail(email, {
            redirectTo: location.origin + location.pathname
        });
        if (error) throw error;
        if (errEl) {
            errEl.style.color = '#10B981';
            errEl.textContent = 'Email inviata! Controlla la posta (anche lo spam).';
        }
    } catch (e) {
        if (errEl) {
            errEl.style.color = '#F87171';
            errEl.textContent = e.message;
        }
    }
}

// Form mostrato al rientro dal link email: imposta la nuova password
function showNewPasswordForm() {
    $('auth-modal-content').innerHTML = `
        <button class="auth-close" onclick="hideAuthModal()">✕</button>
        <h2 class="auth-title">Nuova password</h2>
        <p class="auth-sub">Scegli una nuova password per il tuo account.</p>
        <input id="auth-new-password"  type="password" placeholder="Nuova password" class="auth-input">
        <input id="auth-new-password2" type="password" placeholder="Conferma password" class="auth-input"
               onkeydown="if(event.key==='Enter')submitNewPassword()">
        <div id="auth-error" class="auth-error"></div>
        <div class="auth-actions">
            <button class="auth-btn-primary" onclick="submitNewPassword()">Salva password</button>
        </div>`;
    $('auth-modal').style.display = 'flex';
    setTimeout(() => $('auth-new-password')?.focus(), 50);
}

async function submitNewPassword() {
    const p1 = $('auth-new-password')?.value;
    const p2 = $('auth-new-password2')?.value;
    const errEl = $('auth-error');
    if (errEl) { errEl.textContent = ''; errEl.style.color = '#F87171'; }

    if (!p1 || !p2)   { if (errEl) errEl.textContent = 'Compila entrambi i campi.'; return; }
    if (p1 !== p2)    { if (errEl) errEl.textContent = 'Le password non coincidono.'; return; }
    if (p1.length < 6){ if (errEl) errEl.textContent = 'Minimo 6 caratteri.'; return; }

    try {
        const { error } = await _sb.auth.updateUser({ password: p1 });
        if (error) throw error;
        hideAuthModal();   // resetta _recovering e ricarica i dati cloud
        _showSyncBadge('Password aggiornata');
    } catch (e) {
        if (errEl) errEl.textContent = e.message;
    }
}

function hideAuthModal() {
    $('auth-modal').style.display = 'none';
    const err = $('auth-error');
    if (err) err.textContent = '';
    // Uscendo dal flusso di recupero la sessione è comunque valida: carica i dati
    if (_recovering) { _recovering = false; _loadCloud(); }
}

async function submitAuth(mode) {
    const email    = $('auth-email')?.value.trim();
    const password = $('auth-password')?.value;
    const errEl    = $('auth-error');
    if (errEl) errEl.textContent = '';

    if (!email || !password) { if (errEl) errEl.textContent = 'Inserisci email e password.'; return; }

    try {
        if (mode === 'signin') {
            const { error } = await _sb.auth.signInWithPassword({ email, password });
            if (error) throw error;
            hideAuthModal();
        } else {
            const { error } = await _sb.auth.signUp({ email, password });
            if (error) throw error;
            if (errEl) {
                errEl.style.color = '#10B981';
                errEl.textContent = 'Registrazione ok! Controlla la tua email per confermare.';
            }
        }
    } catch(e) {
        if (errEl) {
            errEl.style.color = '#F87171';
            errEl.textContent = e.message;
        }
    }
}
