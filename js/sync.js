// ─────────────────────────────────────────────────────────────────────────────
// sync.js — cloud progress sync (push / pull / merge)
// Depends on: config.js, auth.js (window._sb, Auth), app.js (applyProgressData, S)
// Exposes global: Sync
// ─────────────────────────────────────────────────────────────────────────────

const Sync = (() => {
  if (typeof CONFIG === 'undefined' || !CONFIG.FEATURES?.SYNC_ENABLED) {
    return {
      push: () => Promise.resolve(),
      pullOnLoad: () => Promise.resolve(),
      debouncedPush: () => {},
      checkOnLogin: () => Promise.resolve(),
    };
  }

  let _pushTimer = null;
  let _pushing   = false;

  // ── Merge strategy: keep the "better" answer per question key ─────────────
  //   Priority: k (known) > n (wrong) > s (seen) > u (untouched)
  //   SRS timestamps: keep whichever is further in the future
  //   Streak: keep higher
  //   Preferences (lang, state, theme): always keep local values
  const _PRIO = { k: 3, n: 2, s: 1, u: 0 };
  const _META = new Set(['sk', 'ld', 'lang', 'state', 'theme', 'mc', 'mcr', 'lastPush']);

  function _merge(local, server) {
    const out = { ...server };

    for (const key of Object.keys(local)) {
      if (_META.has(key)) continue;

      if (key.startsWith('srs_') || key.startsWith('rep_')) {
        // SRS: keep higher value (further review date / higher repetition level)
        out[key] = Math.max(local[key] || 0, out[key] || 0);
      } else {
        // Question status key: keep higher-priority status
        const lp = _PRIO[local[key]] ?? -1;
        const sp = _PRIO[out[key]]   ?? -1;
        if (lp > sp) out[key] = local[key];
      }
    }

    // Preserve local user preferences (device-specific)
    out.lang  = local.lang;
    out.state = local.state;
    out.theme = local.theme;
    // Keep the better streak
    out.sk = Math.max(local.sk || 0, server.sk || 0);

    return out;
  }

  // ── Push local S to server ────────────────────────────────────────────────
  async function push() {
    if (!Auth.isLoggedIn()) return;
    if (_pushing) return; // prevent concurrent pushes
    _pushing = true;
    try {
      const uid = Auth.getSession().user.id;
      const payload = { ...S }; // snapshot current state
      delete payload.lang; delete payload.state; delete payload.theme; // don't sync prefs
      await window._sb.from('progress').upsert({
        user_id: uid,
        data: payload,
      });
      S.lastPush = Date.now();
      localStorage.setItem('et5', JSON.stringify(S));
    } catch (_) { /* silent */ }
    finally { _pushing = false; }
  }

  // ── Debounced push (called from saveS in app.js) ──────────────────────────
  function debouncedPush() {
    if (!Auth.isLoggedIn()) return;
    clearTimeout(_pushTimer);
    _pushTimer = setTimeout(push, CONFIG.SYNC_DEBOUNCE_MS || 30000);
  }

  // ── Pull from server and merge into local ─────────────────────────────────
  async function pull() {
    if (!Auth.isLoggedIn()) return false;
    try {
      const uid = Auth.getSession().user.id;
      const { data, error } = await window._sb
        .from('progress')
        .select('data, updated_at')
        .eq('user_id', uid)
        .single();
      if (error || !data?.data) return false;

      const serverUpdatedAt = new Date(data.updated_at).getTime();
      const localLastPush   = S.lastPush || 0;

      if (serverUpdatedAt <= localLastPush) return false; // local is same or newer

      const merged = _merge(S, data.data);
      if (typeof applyProgressData === 'function') applyProgressData(merged);
      return true;
    } catch (_) {
      return false;
    }
  }

  // ── Called on page load (after auth.init resolves) ────────────────────────
  async function pullOnLoad() {
    if (!Auth.isLoggedIn()) return;
    const pulled = await pull();
    if (pulled && typeof showToast === 'function') {
      showToast('info', '☁️ Fortschritt synchronisiert');
    }
  }

  // ── Called when user first logs in: offer import / merge ─────────────────
  async function checkOnLogin() {
    if (!Auth.isLoggedIn()) return;
    try {
      const uid = Auth.getSession().user.id;
      const { data } = await window._sb
        .from('progress')
        .select('data')
        .eq('user_id', uid)
        .maybeSingle();

      const serverData  = data?.data || null;
      const localKeys   = Object.keys(S).filter(k => !_META.has(k) && !k.startsWith('srs_') && !k.startsWith('rep_'));
      const hasLocalProg = localKeys.length > 0;
      const hasServerProg = serverData && Object.keys(serverData).filter(k => !_META.has(k)).length > 0;

      if (!hasServerProg && hasLocalProg) {
        // Server empty → silently push local data
        await push();
        if (typeof showToast === 'function') showToast('success', '☁️ Lokaler Fortschritt gespeichert');
        return;
      }

      if (hasServerProg && hasLocalProg) {
        // Both have data → ask the user
        _showImportModal(serverData);
        return;
      }

      if (hasServerProg && !hasLocalProg) {
        // Server has data, local is empty → pull silently
        const merged = _merge(S, serverData);
        if (typeof applyProgressData === 'function') applyProgressData(merged);
        if (typeof showToast === 'function') showToast('info', '☁️ Gespeicherter Fortschritt geladen');
      }
    } catch (_) { /* silent */ }
  }

  // ── Import decision modal ─────────────────────────────────────────────────
  function _showImportModal(serverData) {
    if (document.getElementById('sync-import-modal')) return;
    const el = document.createElement('div');
    el.className = 'overlay open';
    el.id = 'sync-import-modal';
    el.innerHTML = `
<div class="overlay-box" style="max-width:400px;text-align:center">
  <h3 style="margin-bottom:10px">Fortschritt zusammenführen?</h3>
  <p style="font-size:12.5px;color:var(--txt2);margin-bottom:18px">
    Du hast lokalen Fortschritt UND gespeicherte Cloud-Daten.<br>Was möchtest du tun?
  </p>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button class="bp" style="flex:1" onclick="Sync._importMerge()">Zusammenführen</button>
    <button class="bs" style="flex:1" onclick="Sync._importKeepLocal()">Lokal behalten</button>
    <button class="bs" style="flex:1" onclick="Sync._importUseServer()">Cloud-Daten laden</button>
  </div>
</div>`;
    document.body.appendChild(el);
    window._syncImportServerData = serverData;
  }

  function _closeImportModal() {
    const el = document.getElementById('sync-import-modal');
    if (el) el.remove();
  }

  function _importMerge() {
    const serverData = window._syncImportServerData;
    if (!serverData) { _closeImportModal(); return; }
    const merged = _merge(S, serverData);
    if (typeof applyProgressData === 'function') applyProgressData(merged);
    push();
    _closeImportModal();
    if (typeof showToast === 'function') showToast('success', '☁️ Fortschritt zusammengeführt');
  }

  function _importKeepLocal() {
    push(); // push local data to overwrite server
    _closeImportModal();
    if (typeof showToast === 'function') showToast('info', 'Lokaler Fortschritt beibehalten');
  }

  function _importUseServer() {
    const serverData = window._syncImportServerData;
    if (!serverData) { _closeImportModal(); return; }
    const merged = _merge({}, serverData); // use server as base, no local override
    // keep local prefs
    merged.lang  = S.lang;
    merged.state = S.state;
    merged.theme = S.theme;
    if (typeof applyProgressData === 'function') applyProgressData(merged);
    _closeImportModal();
    if (typeof showToast === 'function') showToast('info', '☁️ Cloud-Daten geladen');
  }

  // Listen for login event
  document.addEventListener('auth:login', () => {
    setTimeout(checkOnLogin, 500); // slight delay to let app.js finish init
  });

  return {
    push, debouncedPush, pullOnLoad, checkOnLogin,
    // semi-private (called from HTML onclick)
    _importMerge, _importKeepLocal, _importUseServer,
  };
})();
