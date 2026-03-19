// ─────────────────────────────────────────────────────────────────────────────
// Supabase Edge Function: analytics-report
// Returns weekly cohort data for the admin dashboard.
// Protected by ADMIN_SECRET env var — pass as Bearer token.
// Deploy: supabase functions deploy analytics-report
// Required secrets: ADMIN_SECRET, SUPABASE_SERVICE_ROLE_KEY
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // ── Auth: check admin secret ──────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (!token || token !== Deno.env.get('ADMIN_SECRET')) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
  }

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    // ── Weekly event counts (last 12 weeks) ─────────────────────────────────
    const { data: weeklyEvents, error: e1 } = await sb.rpc('analytics_weekly_events')
    if (e1) throw e1

    // ── Weekly new users ─────────────────────────────────────────────────────
    const { data: weeklyUsers, error: e2 } = await sb.rpc('analytics_weekly_users')
    if (e2) throw e2

    // ── Weekly cohort retention (W0 signup → W1 return) ──────────────────────
    const { data: cohortRetention, error: e3 } = await sb.rpc('analytics_cohort_retention')
    if (e3) throw e3

    // ── Totals ────────────────────────────────────────────────────────────────
    const { count: totalUsers } = await sb.from('profiles').select('*', { count: 'exact', head: true })
    const { count: proUsers }   = await sb.from('profiles').select('*', { count: 'exact', head: true }).eq('plan', 'pro')
    const { count: totalEvents } = await sb.from('events').select('*', { count: 'exact', head: true })

    return new Response(JSON.stringify({
      generated_at: new Date().toISOString(),
      totals: { users: totalUsers, pro_users: proUsers, events: totalEvents },
      weekly_events: weeklyEvents ?? [],
      weekly_users: weeklyUsers ?? [],
      cohort_retention: cohortRetention ?? [],
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
