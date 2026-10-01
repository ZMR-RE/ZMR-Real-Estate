// SIMULATED sign-in for the review page only (aliased in place of
// shared/auth/AuthContext by vite.rent-invoices-review.config.ts).
import { REVIEW_ACCOUNT } from './reviewFixtures'

export function useAuth() {
  return {
    session: { user: { id: 'review-user', email: 'review@example.test' } } as never,
    accountId: REVIEW_ACCOUNT,
    loading: false,
    signOut: async () => {},
  }
}
