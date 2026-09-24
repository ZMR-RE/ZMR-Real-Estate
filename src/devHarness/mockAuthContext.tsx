// ISOLATED MOCK for the harness only. Aliased in place of
// ../../shared/auth/AuthContext by vite.harness.config.ts's
// resolve.alias — every real component's `import { useAuth } from
// '../../shared/auth/AuthContext'` resolves to THIS file only inside the
// harness bundle. The real AuthContext.tsx is never modified, imported,
// or exercised by the harness.
import { FIXTURE_ACCOUNT_ID } from './fixtures'

export function useAuth() {
  return {
    session: { user: { id: 'mock-user' } } as never,
    accountId: FIXTURE_ACCOUNT_ID,
    loading: false,
    signOut: async () => {},
  }
}
