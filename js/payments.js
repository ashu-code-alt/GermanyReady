// ─────────────────────────────────────────────────────────────────────────────
// payments.js — Pro entitlements, mock exam gate, paywall UI, Stripe Checkout
// Depends on: config.js, auth.js, analytics.js, window._sb
// Exposes global: Payments
// ─────────────────────────────────────────────────────────────────────────────

const Payments = (() => {
  if (typeof CONFIG === 'undefined' || !CONFIG.FEATURES?.PAYMENTS_ENABLED) {
    return {
      checkMockGuard:         () => true,
      showPricingPage:        () => {},
      showPaywall:            () => {},
      startCheckout:          () => Promise.resolve(),
      checkReturnFromStripe:  () => {},
      getMockCount:           () => 0,
    };
  }

  // ── Mock exam counter (stored in localStorage via S object) ───────────────
  function _thisMonth() {
    const d = new Date();
    return d.getFullYear() + '-' + d.getMonth();
  }

  function getMockCount() {
    // Reset counter if month has rolled over
    if ((typeof S !== 'undefined') && S.mcr !== _thisMonth()) {
      S.mc  = 0;
      S.mcr = _thisMonth();
      if (typeof saveS === 'function') saveS();
    }
    return (typeof S !== 'undefined' ? S.mc : 0) || 0;
  }

  function _incrementMockCount() {
    if (typeof S === 'undefined') return;
    S.mc  = getMockCount() + 1;
    S.mcr = _thisMonth();
    if (typeof saveS === 'function') saveS();
  }

  // ── Mock guard: called before startMock() in app.js ──────────────────────
  // Returns true = allow, false = blocked (paywall shown)
  function checkMockGuard() {
    if (typeof Auth !== 'undefined' && Auth.isPro()) {
      // Pro: unlimited, no counter
      return true;
    }
    const count = getMockCount();
    if (count < (CONFIG.FREE_MOCK_LIMIT || 3)) {
      _incrementMockCount();
      return true;
    }
    // Blocked
    showPaywall('mock_exam');
    if (typeof Analytics !== 'undefined') {
      Analytics.track('paywall_viewed', { feature: 'mock_exam', count });
    }
    return false;
  }

  // ── Paywall overlay ────────────────────────────────────────────────────────
  function showPaywall(feature) {
    _buildPaywallOverlay(feature);
    const el = document.getElementById('paywall-overlay');
    if (el) el.classList.add('open');
  }

  function _closePaywall() {
    const el = document.getElementById('paywall-overlay');
    if (el) el.classList.remove('open');
  }

  function _buildPaywallOverlay(feature) {
    // Remove stale overlay
    const old = document.getElementById('paywall-overlay');
    if (old) old.remove();

    const triggerMsg = {
      mock_exam: `Du hast dein Limit von ${CONFIG.FREE_MOCK_LIMIT || 3} Probetests diesen Monat erreicht.`,
      sync:      'Cloud-Synchronisation ist ein PRO-Feature.',
      stats:     'Erweiterte Statistiken sind ein PRO-Feature.',
      nav:       'Entdecke alle PRO-Vorteile.',
    }[feature] || 'Dieses Feature ist PRO-exklusiv.';

    const el = document.createElement('div');
    el.className = 'overlay';
    el.id = 'paywall-overlay';
    el.innerHTML = `
<div class="overlay-box paywall-box">
  <button class="auth-close-btn" onclick="Payments._closePaywall()">✕</button>
  <div class="paywall-trigger">${triggerMsg}</div>

  <div class="pricing-grid">
    <!-- FREE column -->
    <div class="price-card">
      <div class="price-tier">Kostenlos</div>
      <div class="price-amount">€0<small> /Monat</small></div>
      <div class="price-feature yes">✓ Alle 300 BAMF-Fragen</div>
      <div class="price-feature yes">✓ Lernmodus (Karteikarten)</div>
      <div class="price-feature yes">✓ Quiz nach Themen</div>
      <div class="price-feature yes">✓ ${CONFIG.FREE_MOCK_LIMIT || 3} Probetests / Monat</div>
      <div class="price-feature yes">✓ 16 Bundesland-Fragen</div>
      <div class="price-feature no">✗ Cloud-Synchronisation</div>
      <div class="price-feature no">✗ Unbegrenzte Probetests</div>
      <div class="price-feature no">✗ Fortschritt-Statistiken</div>
    </div>

    <!-- PRO column -->
    <div class="price-card pro">
      <div class="price-tier pro">PRO ⭐</div>
      <div class="price-amount">€2,99<small> /Monat</small></div>
      <div class="price-feature yes">✓ Alles in Kostenlos +</div>
      <div class="price-feature yes">✓ Unbegrenzte Probetests</div>
      <div class="price-feature yes">✓ Cloud-Sync (alle Geräte)</div>
      <div class="price-feature yes">✓ Fortschritt-Statistiken</div>
      <div class="price-feature yes">✓ Vorrangiger Support</div>
      <div class="price-feature yes">✓ Jederzeit kündbar</div>
    </div>
  </div>

  <button class="bp paywall-cta" onclick="Payments.startCheckout()">
    Jetzt PRO werden — €2,99/Monat
  </button>
  <div style="text-align:center;margin-top:9px">
    <button class="auth-magic-link" onclick="Payments._closePaywall()">Vielleicht später</button>
  </div>
  <p style="font-size:10.5px;color:var(--txt3);text-align:center;margin-top:10px">
    Jederzeit kündbar · Bezahlung per Kreditkarte oder SEPA-Lastschrift · Stripe Checkout
  </p>
</div>`;
    document.body.appendChild(el);
  }

  // ── Pricing page (shown from sidebar "Pro" nav item) ──────────────────────
  function showPricingPage() {
    showPaywall('nav');
    if (typeof Analytics !== 'undefined') {
      Analytics.track('paywall_viewed', { feature: 'nav' });
    }
  }

  // ── Stripe Checkout ────────────────────────────────────────────────────────
  async function startCheckout() {
    if (typeof Auth === 'undefined') return;

    if (!Auth.isLoggedIn()) {
      // Need to log in first; re-open paywall after login
      _closePaywall();
      Auth.openModal('pro');
      // Listen for login, then auto-trigger checkout
      document.addEventListener('auth:login', () => {
        setTimeout(startCheckout, 800);
      }, { once: true });
      return;
    }

    if (typeof Analytics !== 'undefined') {
      Analytics.track('checkout_started', { plan: 'pro_monthly' });
    }

    try {
      const { data, error } = await window._sb.functions.invoke('create-checkout', {
        body: {
          price_id:   CONFIG.PRO_PRICE_ID,
          return_url: window.location.href,
        },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      if (typeof showToast === 'function') {
        showToast('error', 'Fehler beim Checkout: ' + (err?.message || err));
      }
    }
  }

  // ── Handle return from Stripe (called from app.js init()) ─────────────────
  function checkReturnFromStripe() {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (!payment) return;

    // Clean URL immediately
    history.replaceState({}, '', window.location.pathname);

    if (payment === 'success') {
      // Webhook may take a second — poll profile up to 5x
      let attempts = 0;
      const poll = async () => {
        attempts++;
        if (typeof Auth === 'undefined') return;
        const profile = await Auth.refreshProfile();
        if (profile?.plan === 'pro') {
          if (typeof showToast === 'function') showToast('success', 'PRO aktiviert! Willkommen an Bord. 🎉', 6000);
          if (typeof Analytics !== 'undefined') Analytics.track('purchase_completed', { plan: 'pro_monthly' });
          _updateProNavBadge();
        } else if (attempts < 5) {
          setTimeout(poll, 2000);
        } else {
          if (typeof showToast === 'function') {
            showToast('info', 'Zahlung eingegangen. Konto wird aktiviert — bitte in Kürze neu laden.', 7000);
          }
        }
      };
      setTimeout(poll, 1500);
    }

    if (payment === 'cancelled') {
      if (typeof showToast === 'function') showToast('info', 'Checkout abgebrochen.');
    }
  }

  function _updateProNavBadge() {
    const badge = document.getElementById('pro-badge-text');
    if (badge) badge.textContent = 'PRO ✓';
    badge?.classList.add('pro-badge');
  }

  return {
    checkMockGuard, getMockCount,
    showPaywall, showPricingPage, startCheckout, checkReturnFromStripe,
    // semi-private (HTML onclick)
    _closePaywall,
  };
})();
