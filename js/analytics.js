// ─────────────────────────────────────────────────────────────────────────────
// analytics.js — lightweight event tracking via Supabase events table
// No external trackers. All data stays on your own EU Supabase instance.
// Depends on: config.js, auth.js (window._sb and Auth)
// Exposes global: Analytics
// ─────────────────────────────────────────────────────────────────────────────

const Analytics = (() => {
  // Guard: disabled or missing config
  if (typeof CONFIG === 'undefined' || !CONFIG.FEATURES?.ANALYTICS_ENABLED) {
    return { track: () => {}, trackPageView: () => {} };
  }

  // ── Session ID (persists for browser tab lifetime) ─────────────────────────
  let _sessionId = sessionStorage.getItem('gp_sid');
  if (!_sessionId) {
    _sessionId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('gp_sid', _sessionId);
  }

  // ── Event queue (flush in batch to reduce round-trips) ────────────────────
  let _queue = [];
  let _flushTimer = null;

  function _flush() {
    if (!_queue.length) return;
    if (!window._sb) return; // Supabase not ready yet
    const batch = _queue.splice(0); // drain queue atomically
    window._sb.from('events').insert(batch)
      .then(() => {})
      .catch(() => {}); // silent — analytics must never break the app
  }

  function _scheduleFlush() {
    if (_flushTimer) return;
    _flushTimer = setTimeout(() => {
      _flushTimer = null;
      _flush();
    }, 2000); // batch window: 2 seconds
  }

  // ── Public: track(event, props) ───────────────────────────────────────────
  // Fire-and-forget. NEVER awaited by callers.
  function track(event, props) {
    try {
      const userId = (typeof Auth !== 'undefined' && Auth.isLoggedIn())
        ? Auth.getSession()?.user?.id
        : null;
      // Enrich with basic context (no PII, no fingerprinting)
      const enriched = {
        ...(props || {}),
        lang:  (typeof S !== 'undefined' && S.lang)   || undefined,
        state: (typeof S !== 'undefined' && S.state)  || undefined,
      };
      _queue.push({
        user_id:    userId,
        session_id: _sessionId,
        event,
        props: enriched,
      });
      _scheduleFlush();
    } catch (_) { /* never throw */ }
  }

  // Flush on page hide (beforeunload / visibilitychange)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') _flush();
  });
  window.addEventListener('beforeunload', _flush);

  return { track };
})();
