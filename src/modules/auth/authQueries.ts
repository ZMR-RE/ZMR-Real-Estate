import { supabase } from '../../shared/supabaseClient'

export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}
