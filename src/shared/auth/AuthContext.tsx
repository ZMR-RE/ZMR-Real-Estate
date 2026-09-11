import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import { ResetPasswordScreen } from '../../modules/account/ResetPasswordScreen'
import { MfaChallengeScreen } from '../../modules/account/MfaChallengeScreen'

interface AuthContextValue {
  session: Session | null
  accountId: string | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)
  const [needsMfaChallenge, setNeedsMfaChallenge] = useState(false)
  const [mfaChecked, setMfaChecked] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true)
      }
      if (event === 'USER_UPDATED') {
        setIsPasswordRecovery(false)
      }
      setSession(newSession)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session || isPasswordRecovery) {
      setNeedsMfaChallenge(false)
      setMfaChecked(true)
      return
    }

    let cancelled = false
    setMfaChecked(false)
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
      if (cancelled) return
      setNeedsMfaChallenge(!!data && data.currentLevel !== data.nextLevel && data.nextLevel === 'aal2')
      setMfaChecked(true)
    })
    return () => {
      cancelled = true
    }
  }, [session, isPasswordRecovery])

  useEffect(() => {
    if (!session) {
      setAccountId(null)
      return
    }

    supabase
      .from('account_members')
      .select('account_id')
      .eq('user_id', session.user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setAccountId(data?.account_id ?? null)
      })
  }, [session])

  const signOut = async () => {
    await supabase.auth.signOut()
    setIsPasswordRecovery(false)
    setNeedsMfaChallenge(false)
  }

  // Holds `loading` true through the MFA assurance-level check for a real
  // session too, so protected content never flashes before the 2FA gate
  // below has a chance to apply.
  const loading = authLoading || (!!session && !isPasswordRecovery && !mfaChecked)

  let gated: ReactNode = children
  if (!loading) {
    if (isPasswordRecovery) {
      gated = <ResetPasswordScreen onSignOut={signOut} />
    } else if (needsMfaChallenge) {
      gated = <MfaChallengeScreen onSignOut={signOut} />
    }
  }

  return (
    <AuthContext.Provider value={{ session, accountId, loading, signOut }}>{gated}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
