import { useAuth } from './shared/auth/AuthContext'
import { LoginForm } from './modules/auth/LoginForm'
import { PropertyRegistry } from './modules/properties/PropertyRegistry'
import { CaptureInbox } from './modules/capture/CaptureInbox'
import { ReconciliationQueue } from './modules/reconciliation/ReconciliationQueue'

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
      <header>
        <span>Signed in as {session.user.email}</span>
        <button type="button" onClick={signOut}>
          Sign out
        </button>
      </header>
      <PropertyRegistry />
      <CaptureInbox />
      <ReconciliationQueue />
    </div>
  )
}

export default App
