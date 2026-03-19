// ─────────────────────────────────────────────────────────────────────────────
// Supabase Edge Function: create-checkout
// Called by payments.js to create a Stripe Checkout Session.
// Deploy: supabase functions deploy create-checkout
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Verify caller is an authenticated Supabase user ────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const { price_id, return_url } = await req.json()
    if (!price_id || !return_url) {
      return new Response(JSON.stringify({ error: 'Missing price_id or return_url' }), { status: 400, headers: corsHeaders })
    }

    // ── Look up or create Stripe customer ──────────────────────────────────
    const sbAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: profile } = await sbAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    let customerId: string | undefined = profile?.stripe_customer_id || undefined
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_uid: user.id },
      })
      customerId = customer.id
      await sbAdmin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    // ── Create Checkout Session ────────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      customer:               customerId,
      client_reference_id:    user.id,        // used in webhook to find the user
      mode:                   'subscription',
      payment_method_types:   ['card', 'sepa_debit'],
      line_items:             [{ price: price_id, quantity: 1 }],
      success_url:            return_url + (return_url.includes('?') ? '&' : '?') + 'payment=success',
      cancel_url:             return_url + (return_url.includes('?') ? '&' : '?') + 'payment=cancelled',
      locale:                 'de',
      currency:               'eur',
      billing_address_collection: 'required',
      tax_id_collection:          { enabled: true },
      subscription_data: {
        metadata: { supabase_uid: user.id },
      },
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('create-checkout error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
