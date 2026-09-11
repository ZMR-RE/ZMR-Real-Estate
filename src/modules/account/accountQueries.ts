import { supabase } from '../../shared/supabaseClient'

// Standard Supabase Auth reset-by-email: sends a recovery link to the
// given address. redirectTo points back at this app's own origin so the
// PASSWORD_RECOVERY session lands where AuthContext can intercept it
// (see shared/auth/AuthContext.tsx) — works for both local dev and
// whatever origin the app is actually deployed at.
export async function requestPasswordReset(email: string) {
  return supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
}

export async function updatePassword(newPassword: string) {
  return supabase.auth.updateUser({ password: newPassword })
}

export async function listTotpFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors()
  return { data: data?.all.filter((f) => f.factor_type === 'totp') ?? null, error }
}

export async function enrollTotpFactor() {
  return supabase.auth.mfa.enroll({ factorType: 'totp' })
}

// Used both to finish an enrollment (factor moves unverified -> verified)
// and to satisfy the aal1->aal2 login challenge — same underlying call.
export async function verifyTotpCode(factorId: string, code: string) {
  return supabase.auth.mfa.challengeAndVerify({ factorId, code })
}

export async function unenrollFactor(factorId: string) {
  return supabase.auth.mfa.unenroll({ factorId })
}

export async function getAuthenticatorAssuranceLevel() {
  return supabase.auth.mfa.getAuthenticatorAssuranceLevel()
}
