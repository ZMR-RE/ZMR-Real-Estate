import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars')
}

// ISOLATED-INTEGRATION — fail-closed guard for the practice review
// server (npm run dev:practice, vite.practice.config.ts). Real npm run
// dev never sets VITE_PRACTICE_TARGET, so this whole block is inert
// there. The practice project's ref is never hardcoded here (this file
// has no way to know it in advance); what's hardcoded is the one thing
// that must never happen — pointing "practice" at the actual production
// project, either by envs/practice/.env being left blank (env vars
// missing) or by someone pasting the production URL into it by mistake.
// Refusing to start beats silently running real-account UI tests
// against production.
const PRODUCTION_PROJECT_REF = 'jsrovnaxrtllvvavfqvq'
if (import.meta.env.VITE_PRACTICE_TARGET === 'true') {
  if (supabaseUrl.includes(PRODUCTION_PROJECT_REF)) {
    throw new Error(
      'Practice review server refused to start: envs/practice/.env points at the production Supabase project. ' +
        'Fix VITE_SUPABASE_URL there to the separate practice project before restarting.',
    )
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
