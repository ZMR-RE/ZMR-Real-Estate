import { useAuth } from './shared/auth/AuthContext'
import { LoginForm } from './modules/auth/LoginForm'

function App() {
  const { session, loading, signOut } = useAuth()

  if (loading) {
    return null
  }

  if (!session) {
    return <LoginForm />
  }

  return (
    <div>
      <p>Signed in as {session.user.email}</p>
      <button type="button" onClick={signOut}>
        Sign out
      </button>
    </div>
  )
}

export default App
