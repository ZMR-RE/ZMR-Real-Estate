import { useLoginForm } from './useLoginForm'

export function LoginForm() {
  const { email, setEmail, password, setPassword, error, submitting, handleSubmit } =
    useLoginForm()

  return (
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
    </form>
  )
}
