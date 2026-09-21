import { useState, type FormEvent } from 'react'
import { updatePassword } from './accountQueries'

interface ResetPasswordScreenProps {
  onSignOut: () => void
}

// Rendered by AuthContext.tsx in place of the whole app whenever a
// PASSWORD_RECOVERY session is active (i.e. the user clicked the link
// from a password-reset email). Calling updatePassword() below fires a
// USER_UPDATED auth event, which AuthContext listens for to clear the
// recovery flag and hand control back to the normal app — no manual
// "done" callback needed here. Takes signOut as a prop (rather than
// calling useAuth()) to avoid a circular import with AuthContext.tsx.
export function ResetPasswordScreen({ onSignOut }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    const { error: updateError } = await updatePassword(password)
    setSubmitting(false)
    if (updateError) {
      setError(updateError.message)
    }
  }

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit}>
        <h1>Set a new password</h1>

        <label htmlFor="new_password">
          New password<span className="required-marker">*</span>
        </label>
        <input
          id="new_password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        <label htmlFor="confirm_password">
          Confirm new password<span className="required-marker">*</span>
        </label>
        <input
          id="confirm_password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Set new password'}
        </button>
        <button type="button" onClick={onSignOut} disabled={submitting}>
          Cancel
        </button>
      </form>
    </div>
  )
}
