import { useEffect, useState, type FormEvent } from 'react'
import { listTotpFactors, verifyTotpCode } from './accountQueries'

interface MfaChallengeScreenProps {
  onSignOut: () => void
}

// Rendered by AuthContext.tsx in place of the whole app whenever the
// session is aal1 but a verified TOTP factor exists (aal2 required) —
// i.e. right after a password sign-in when 2FA is enabled. A successful
// verify fires MFA_CHALLENGE_VERIFIED, which updates the session and lets
// AuthContext's own assurance-level check clear this gate automatically.
// Takes signOut as a prop (rather than calling useAuth()) to avoid a
// circular import with AuthContext.tsx.
export function MfaChallengeScreen({ onSignOut }: MfaChallengeScreenProps) {
  const [factorId, setFactorId] = useState<string | null>(null)
  const [loadingFactor, setLoadingFactor] = useState(true)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    listTotpFactors().then(({ data, error: fetchError }) => {
      setLoadingFactor(false)
      if (fetchError) {
        setError(fetchError.message)
        return
      }
      const verified = (data ?? []).find((f) => f.status === 'verified')
      setFactorId(verified?.id ?? null)
    })
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!factorId) return
    setError(null)
    setVerifying(true)
    const { error: verifyError } = await verifyTotpCode(factorId, code)
    setVerifying(false)
    if (verifyError) {
      setError(verifyError.message)
    }
  }

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit}>
        <h1>Two-factor verification</h1>
        <p>Enter the 6-digit code from your authenticator app to continue.</p>

        {loadingFactor ? (
          <p>Loading…</p>
        ) : !factorId ? (
          <p role="alert">No verified authenticator app found for this account.</p>
        ) : (
          <>
            <label htmlFor="mfa_challenge_code">Authentication code</label>
            <input
              id="mfa_challenge_code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              required
            />
          </>
        )}

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={verifying || !factorId || code.trim().length === 0}>
          {verifying ? 'Verifying…' : 'Verify'}
        </button>
        <button type="button" onClick={onSignOut} disabled={verifying}>
          Sign out
        </button>
      </form>
    </div>
  )
}
