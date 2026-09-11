import { useLoginForm } from './useLoginForm'

export function LoginForm() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    error,
    submitting,
    handleSubmit,
    isResettingPassword,
    startResettingPassword,
    cancelResettingPassword,
    resetState,
    submitPasswordReset,
  } = useLoginForm()

  if (isResettingPassword) {
    return (
      <div className="auth-page">
        <form onSubmit={submitPasswordReset}>
          <h1>Reset your password</h1>

          <label htmlFor="reset_email">Email</label>
          <input
            id="reset_email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          {error && <p role="alert">{error}</p>}
          {resetState === 'sent' && <p>Reset email sent — check your inbox.</p>}

          <button type="submit" disabled={resetState === 'sending'}>
            {resetState === 'sending' ? 'Sending…' : 'Send reset email'}
          </button>
          <button type="button" onClick={cancelResettingPassword}>
            Back to sign in
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit}>
        <h1>ZMR Real Estate</h1>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
        <button type="button" onClick={startResettingPassword}>
          Forgot password?
        </button>
      </form>
    </div>
  )
}
