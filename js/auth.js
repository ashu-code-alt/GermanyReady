// ─────────────────────────────────────────────────────────────────────────────
// auth.js — Supabase auth, login modal, session management
// Depends on: config.js loaded before this file, window.supabase (CDN)
// Exposes global: Auth
// ─────────────────────────────────────────────────────────────────────────────

const Auth = (() => {
  // ── Guard: feature disabled or missing config ──────────────────────────────
  if (typeof CONFIG === 'undefined' || !CONFIG.FEATURES?.AUTH_ENABLED) {
    return {
      init: () => Promise.resolve(),
      openModal: () => {},
      closeModal: () => {},
      isLoggedIn: () => false,
      isPro: () => false,
      getSession: () => null,
      getProfile: () => null,
      logout: () => Promise.resolve(),
      deleteAccount: () => Promise.resolve(),
    };
  }

  // ── Supabase client (shared across auth/sync/analytics/payments) ──────────
  window._sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      storageKey: 'gp_auth',
      storage: window.localStorage,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  let _session = null;
  let _profile = null;
  let _modalMode = 'login'; // 'login' | 'register' | 'magic'

  // ── Modal HTML ─────────────────────────────────────────────────────────────
  function _buildModal() {
    if (document.getElementById('auth-modal')) return;
    const el = document.createElement('div');
    el.className = 'overlay';
    el.id = 'auth-modal';
    el.innerHTML = `
<div class="overlay-box auth-box" style="position:relative">
  <button class="auth-close-btn" onclick="Auth.closeModal()" title="Schließen">✕</button>
  <div id="auth-reason" class="auth-reason" style="display:none"></div>

  <div class="auth-tabs">
    <button class="auth-tab act" id="auth-tab-login"    onclick="Auth._switchTab('login')">Anmelden</button>
    <button class="auth-tab"     id="auth-tab-register" onclick="Auth._switchTab('register')">Registrieren</button>
  </div>

  <!-- LOGIN -->
  <div id="auth-pane-login">
    <input  class="auth-input" id="auth-email"    type="email"    placeholder="E-Mail-Adresse" autocomplete="email" />
    <input  class="auth-input" id="auth-password" type="password" placeholder="Passwort"       autocomplete="current-password" />
    <div id="auth-error" class="auth-error" style="display:none"></div>
    <button class="bp auth-submit" id="auth-login-btn" onclick="Auth._doLogin()">Anmelden</button>
    <div class="auth-or"><span>oder</span></div>
    <button class="auth-google-btn" onclick="Auth._doGoogle()">
      <svg width="16" height="16" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z"/></svg>
      Mit Google anmelden
    </button>
    <button class="auth-magic-link" onclick="Auth._switchTab('magic')">Magic Link — kein Passwort nötig</button>
  </div>

  <!-- REGISTER -->
  <div id="auth-pane-register" style="display:none">
    <input  class="auth-input" id="auth-reg-email"    type="email"    placeholder="E-Mail-Adresse" autocomplete="email" />
    <input  class="auth-input" id="auth-reg-password" type="password" placeholder="Passwort (min. 8 Zeichen)" autocomplete="new-password" />
    <div id="auth-reg-error" class="auth-error" style="display:none"></div>
    <label class="auth-consent">
      <input type="checkbox" id="auth-gdpr-check" />
      <span>Ich stimme der <a href="#" onclick="Auth.closeModal();if(typeof showPage==='function')showPage('legal')">Datenschutzerklärung</a> und den <a href="#" onclick="Auth.closeModal();if(typeof showPage==='function')showPage('legal')">Nutzungsbedingungen</a> zu.</span>
    </label>
    <button class="bp auth-submit" id="auth-reg-btn" onclick="Auth._doRegister()">Konto erstellen</button>
    <div class="auth-or"><span>oder</span></div>
    <button class="auth-google-btn" onclick="Auth._doGoogle()">
      <svg width="16" height="16" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z"/></svg>
      Mit Google registrieren
    </button>
  </div>

  <!-- MAGIC LINK -->
  <div id="auth-pane-magic" style="display:none">
    <p style="font-size:12.5px;color:var(--txt2);margin-bottom:12px">Wir senden dir einen Anmeldelink — kein Passwort nötig.</p>
    <input class="auth-input" id="auth-magic-email" type="email" placeholder="E-Mail-Adresse" autocomplete="email" />
    <div id="auth-magic-error" class="auth-error" style="display:none"></div>
    <div id="auth-magic-sent" class="auth-success" style="display:none">✓ Link wurde gesendet — bitte überprüfe deine E-Mails.</div>
    <button class="bp auth-submit" id="auth-magic-btn" onclick="Auth._doMagic()">Link senden</button>
    <button class="auth-magic-link" onclick="Auth._switchTab('login')">← Zurück zur Anmeldung</button>
  </div>
</div>`;
    document.body.appendChild(el);
  }

  // ── Sidebar user badge (injected into existing sidebar) ───────────────────
  function _buildBadge() {
    if (document.getElementById('sb-user-row')) return;
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    const row = document.createElement('div');
    row.className = 'sb-user-row';
    row.id = 'sb-user-row';
    row.innerHTML = `
<button class="sb-login-btn" id="sb-login-btn" onclick="Auth.openModal('manual')">
  <span style="font-size:14px">👤</span>
  <span id="sb-user-label">Anmelden / Registrieren</span>
  <span id="sb-pro-chip" class="sb-pro-chip" style="display:none">PRO</span>
</button>`;
    // Insert after the first child (hero area) if possible, else prepend
    const sbNav = sidebar.querySelector('.sb-nav');
    if (sbNav) sidebar.insertBefore(row, sbNav);
    else sidebar.prepend(row);
  }

  function _updateBadge() {
    const btn = document.getElementById('sb-login-btn');
    const label = document.getElementById('sb-user-label');
    const chip = document.getElementById('sb-pro-chip');
    const settingsAccountCard = document.getElementById('set-account-card');
    const settingsEmail = document.getElementById('set-user-email');
    if (!btn) return;

    if (_session) {
      const email = _session.user?.email || '';
      if (label) label.textContent = email.length > 22 ? email.slice(0, 20) + '…' : email;
      if (chip) chip.style.display = isPro() ? '' : 'none';
      btn.onclick = () => showPage('settings');
      if (settingsAccountCard) settingsAccountCard.style.display = '';
      if (settingsEmail) settingsEmail.textContent = email;
      // Update pro nav badge
      const proBadge = document.getElementById('pro-badge-text');
      if (proBadge) proBadge.textContent = isPro() ? 'PRO ✓' : 'FREE';
    } else {
      if (label) label.textContent = 'Anmelden / Registrieren';
      if (chip) chip.style.display = 'none';
      btn.onclick = () => Auth.openModal('manual');
      if (settingsAccountCard) settingsAccountCard.style.display = 'none';
      const proBadge = document.getElementById('pro-badge-text');
      if (proBadge) proBadge.textContent = 'FREE';
    }
  }

  // ── Profile ────────────────────────────────────────────────────────────────
  async function _loadProfile() {
    if (!_session) return;
    try {
      const { data } = await window._sb
        .from('profiles')
        .select('plan,plan_expires_at,mock_count_month,mock_count_reset_at')
        .eq('id', _session.user.id)
        .single();
      _profile = data || null;
    } catch (_) { _profile = null; }
  }

  // ── Public: init (called from app.js init()) ───────────────────────────────
  async function init() {
    _buildModal();
    _buildBadge();

    // Listen for auth state changes
    window._sb.auth.onAuthStateChange(async (event, session) => {
      _session = session;
      if (event === 'SIGNED_IN') {
        await _loadProfile();
        _updateBadge();
        document.dispatchEvent(new CustomEvent('auth:login', { detail: { session, profile: _profile } }));
      }
      if (event === 'SIGNED_OUT') {
        _profile = null;
        _updateBadge();
        document.dispatchEvent(new CustomEvent('auth:logout'));
      }
    });

    // Check for existing session on load
    const { data: { session } } = await window._sb.auth.getSession();
    _session = session;
    if (session) {
      await _loadProfile();
      _updateBadge();
    }
  }

  // ── Public: modal open/close ───────────────────────────────────────────────
  function openModal(reason) {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    const reasonEl = document.getElementById('auth-reason');
    const reasons = {
      sync:   '☁️ Melde dich an, um deinen Lernfortschritt geräteübergreifend zu synchronisieren.',
      pro:    '⭐ PRO-Feature: Melde dich an und upgrade, um dieses Feature freizuschalten.',
      manual: '',
    };
    if (reasonEl) {
      const msg = reasons[reason] || '';
      reasonEl.textContent = msg;
      reasonEl.style.display = msg ? '' : 'none';
    }
    _switchTab('login');
    modal.classList.add('open');
    setTimeout(() => document.getElementById('auth-email')?.focus(), 100);
  }

  function closeModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('open');
  }

  // ── Tab switching ──────────────────────────────────────────────────────────
  function _switchTab(tab) {
    _modalMode = tab;
    ['login', 'register', 'magic'].forEach(t => {
      const pane = document.getElementById('auth-pane-' + t);
      const btn  = document.getElementById('auth-tab-' + t);
      if (pane) pane.style.display = t === tab ? '' : 'none';
      if (btn)  btn.classList.toggle('act', t === tab);
    });
    // magic tab doesn't have a visible tab button, so only toggle login/register
    if (tab === 'magic') {
      document.getElementById('auth-tab-login')?.classList.remove('act');
      document.getElementById('auth-tab-register')?.classList.remove('act');
    }
  }

  // ── Auth actions ───────────────────────────────────────────────────────────
  function _setError(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.style.display = msg ? '' : 'none'; }
  }

  function _setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (btn) btn.disabled = loading;
  }

  async function _doLogin() {
    const email    = document.getElementById('auth-email')?.value?.trim();
    const password = document.getElementById('auth-password')?.value;
    _setError('auth-error', '');
    if (!email || !password) { _setError('auth-error', 'Bitte E-Mail und Passwort eingeben.'); return; }
    _setLoading('auth-login-btn', true);
    const { error } = await window._sb.auth.signInWithPassword({ email, password });
    _setLoading('auth-login-btn', false);
    if (error) { _setError('auth-error', _friendlyError(error.message)); return; }
    closeModal();
    if (typeof showToast === 'function') showToast('success', 'Erfolgreich angemeldet ✓');
  }

  async function _doRegister() {
    const email    = document.getElementById('auth-reg-email')?.value?.trim();
    const password = document.getElementById('auth-reg-password')?.value;
    const gdpr     = document.getElementById('auth-gdpr-check')?.checked;
    _setError('auth-reg-error', '');
    if (!email || !password) { _setError('auth-reg-error', 'Bitte E-Mail und Passwort eingeben.'); return; }
    if (password.length < 8)  { _setError('auth-reg-error', 'Das Passwort muss mindestens 8 Zeichen haben.'); return; }
    if (!gdpr) { _setError('auth-reg-error', 'Bitte stimme der Datenschutzerklärung zu.'); return; }
    _setLoading('auth-reg-btn', true);
    const { error } = await window._sb.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.href },
    });
    _setLoading('auth-reg-btn', false);
    if (error) { _setError('auth-reg-error', _friendlyError(error.message)); return; }
    // Show confirmation message
    const pane = document.getElementById('auth-pane-register');
    if (pane) pane.innerHTML = `
<div class="auth-success">
  ✓ Konto erstellt! Bitte bestätige deine E-Mail-Adresse.<br>
  <small style="opacity:.7">Überprüfe deinen Posteingang (auch Spam-Ordner).</small>
</div>`;
  }

  async function _doGoogle() {
    await window._sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    });
    // Redirect happens; no further action needed here
  }

  async function _doMagic() {
    const email = document.getElementById('auth-magic-email')?.value?.trim();
    _setError('auth-magic-error', '');
    const sentEl = document.getElementById('auth-magic-sent');
    if (sentEl) sentEl.style.display = 'none';
    if (!email) { _setError('auth-magic-error', 'Bitte E-Mail-Adresse eingeben.'); return; }
    _setLoading('auth-magic-btn', true);
    const { error } = await window._sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href, shouldCreateUser: true },
    });
    _setLoading('auth-magic-btn', false);
    if (error) { _setError('auth-magic-error', _friendlyError(error.message)); return; }
    if (sentEl) sentEl.style.display = '';
  }

  // ── Public: logout ─────────────────────────────────────────────────────────
  async function logout() {
    await window._sb.auth.signOut();
    if (typeof showToast === 'function') showToast('info', 'Abgemeldet.');
  }

  // ── Public: delete account ─────────────────────────────────────────────────
  async function deleteAccount() {
    if (!_session) return;
    const confirmed = window.confirm(
      'Konto wirklich löschen?\n\nAlle Daten (Fortschritt, Konto) werden unwiderruflich gelöscht.\nEin aktives Abonnement wird umgehend gekündigt.'
    );
    if (!confirmed) return;
    // Call Edge Function which uses service role to delete the user
    const { error } = await window._sb.functions.invoke('delete-account', {});
    if (error) { if (typeof showToast === 'function') showToast('error', 'Fehler beim Löschen: ' + error.message); return; }
    await window._sb.auth.signOut();
    if (typeof showToast === 'function') showToast('info', 'Konto gelöscht. Auf Wiedersehen!');
  }

  // ── Public: export user data (GDPR Art. 20 - data portability) ────────────
  async function exportData() {
    const progress = (() => { try { return JSON.parse(localStorage.getItem('et5') || '{}') } catch { return {} } })();
    const payload = {
      exported_at: new Date().toISOString(),
      profile: _profile || null,
      progress,
    };
    // Also fetch server-side progress if logged in
    if (_session) {
      try {
        const { data } = await window._sb.from('progress').select('data,updated_at').eq('user_id', _session.user.id).single();
        if (data) payload.progress_server = data;
      } catch (_) {}
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'germanready-export.json';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    if (typeof showToast === 'function') showToast('success', 'Daten exportiert.');
  }

  // ── Public: refresh profile (called after purchase) ───────────────────────
  async function refreshProfile() {
    await _loadProfile();
    _updateBadge();
    return _profile;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function _friendlyError(msg) {
    if (!msg) return 'Unbekannter Fehler.';
    if (msg.includes('Invalid login credentials')) return 'E-Mail oder Passwort falsch.';
    if (msg.includes('Email not confirmed'))       return 'Bitte bestätige zuerst deine E-Mail.';
    if (msg.includes('User already registered'))   return 'Diese E-Mail ist bereits registriert.';
    if (msg.includes('rate limit'))                return 'Zu viele Versuche. Bitte kurz warten.';
    return msg;
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  function isLoggedIn() { return !!_session; }
  function isPro() {
    if (!_profile) return false;
    if (_profile.plan !== 'pro') return false;
    if (_profile.plan_expires_at && new Date(_profile.plan_expires_at) < new Date()) return false;
    return true;
  }
  function getSession() { return _session; }
  function getProfile()  { return _profile; }

  return {
    init, openModal, closeModal,
    isLoggedIn, isPro, getSession, getProfile,
    logout, deleteAccount, exportData, refreshProfile,
    // semi-private (called from HTML onclick)
    _switchTab, _doLogin, _doRegister, _doGoogle, _doMagic,
  };
})();
