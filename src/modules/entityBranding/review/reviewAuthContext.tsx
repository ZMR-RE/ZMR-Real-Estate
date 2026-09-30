// SIMULATED sign-in for the Branding & documents review page only.
import { REVIEW_ACCOUNT } from './reviewSupabaseClient'

export function useAuth() {
  return {
    session: { user: { id: 'review-user', email: 'review@example.test' } } as never,
    accountId: REVIEW_ACCOUNT,
    loading: false,
    signOut: async () => {},
  }
}
