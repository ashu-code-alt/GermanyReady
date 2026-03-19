// ─────────────────────────────────────────────────────────────────────────────
// GermanyReady — configuration template
// Copy this file to config.js and fill in your values.
// config.js is git-ignored and must NEVER be committed.
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG = {
  // Supabase project (https://app.supabase.com → Project Settings → API)
  SUPABASE_URL: 'https://your-project-ref.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key',

  // Stripe publishable key (pk_live_... or pk_test_... for dev)
  STRIPE_PUBLISHABLE_KEY: 'pk_test_your_stripe_publishable_key',

  // Stripe price ID for the Pro monthly subscription (price_...)
  PRO_PRICE_ID: 'price_your_stripe_price_id',

  // Feature flags — set to false to disable before a feature is ready
  FEATURES: {
    AUTH_ENABLED:      true,
    SYNC_ENABLED:      true,
    PAYMENTS_ENABLED:  true,
    ANALYTICS_ENABLED: true,
  },

  // Free tier: how many mock exams per calendar month
  FREE_MOCK_LIMIT: 3,

  // Debounce (ms) before auto-pushing progress after a save
  SYNC_DEBOUNCE_MS: 30000,
};
