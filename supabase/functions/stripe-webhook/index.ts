// ─────────────────────────────────────────────────────────────────────────────
// Supabase Edge Function: stripe-webhook
// Handles Stripe events: checkout.session.completed, subscription.deleted,
//   invoice.payment_failed, invoice.payment_succeeded
// Register webhook URL in Stripe Dashboard:
//   https://your-project.supabase.co/functions/v1/stripe-webhook
// Required secrets (supabase secrets set ...):
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY
// Deploy: supabase functions deploy stripe-webhook
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

serve(async (req) => {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') ?? ''

  // ── Verify webhook signature ───────────────────────────────────────────────
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature failed:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  // ── Supabase admin client (bypasses RLS) ───────────────────────────────────
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ── Handle events ──────────────────────────────────────────────────────────
  switch (event.type) {

    case 'checkout.session.completed': {
      const session     = event.data.object as Stripe.Checkout.Session
      const uid         = session.client_reference_id          // supabase user id
      const customerId  = session.customer  as string
      const subId       = session.subscription as string

      if (!uid) { console.error('No client_reference_id on session'); break }

      // Fetch subscription to get current period end
      const sub = await stripe.subscriptions.retrieve(subId)
      const expiresAt = new Date(sub.current_period_end * 1000).toISOString()

      await sb.from('profiles').upsert({
        id:                     uid,
        plan:                   'pro',
        stripe_customer_id:     customerId,
        stripe_subscription_id: subId,
        plan_expires_at:        expiresAt,
        mock_count_month:       0,
        mock_count_reset_at:    new Date().toISOString(),
      }, { onConflict: 'id' })

      console.log(`✓ checkout.session.completed: uid=${uid} plan=pro expires=${expiresAt}`)
      break
    }

    case 'invoice.payment_succeeded': {
      // Renewal: update expiry date
      const invoice = event.data.object as Stripe.Invoice
      const subId   = invoice.subscription as string
      if (!subId) break
      const sub = await stripe.subscriptions.retrieve(subId)
      const uid = sub.metadata?.supabase_uid
      if (!uid) break
      const expiresAt = new Date(sub.current_period_end * 1000).toISOString()
      await sb.from('profiles')
        .update({ plan: 'pro', plan_expires_at: expiresAt })
        .eq('stripe_subscription_id', subId)
      console.log(`✓ invoice.payment_succeeded: uid=${uid} renewed until ${expiresAt}`)
      break
    }

    case 'customer.subscription.deleted': {
      // Subscription cancelled or fully lapsed
      const sub = event.data.object as Stripe.Subscription
      await sb.from('profiles')
        .update({ plan: 'free', plan_expires_at: null })
        .eq('stripe_subscription_id', sub.id)
      console.log(`✓ subscription.deleted: sub=${sub.id} → downgraded to free`)
      break
    }

    case 'invoice.payment_failed': {
      // Grace period handling: keep pro until period_end, then subscription.deleted fires
      const invoice = event.data.object as Stripe.Invoice
      console.log(`⚠ invoice.payment_failed: customer=${invoice.customer}`)
      // Optionally: send dunning email via a separate email service
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
