import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './shared/auth/AuthContext'
import { AppShell } from './shared/AppShell'
import { LoginForm } from './modules/auth/LoginForm'
import { PropertyRegistry } from './modules/properties/PropertyRegistry'
import { PropertyProfile } from './modules/properties/PropertyProfile'
import { CaptureInbox } from './modules/capture/CaptureInbox'
import { ReconciliationQueue } from './modules/reconciliation/ReconciliationQueue'
import { RentOps } from './modules/rentOps/RentOps'
import { TaskEngine } from './modules/tasks/TaskEngine'
import { Financials } from './modules/financials/Financials'
import { MortgagePortfolio } from './modules/mortgagePayoff/MortgagePortfolio'

function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return <p className="page-loading">Loading…</p>
  }

  if (!session) {
    return <LoginForm />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/properties" replace />} />
          <Route path="/properties" element={<PropertyRegistry />} />
          <Route path="/properties/:id" element={<PropertyProfile />} />
          <Route path="/capture" element={<CaptureInbox />} />
          <Route path="/reconciliation" element={<ReconciliationQueue />} />
          <Route path="/rent-ops" element={<RentOps />} />
          <Route path="/tasks" element={<TaskEngine />} />
          <Route path="/financials" element={<Financials />} />
          <Route path="/mortgage-portfolio" element={<MortgagePortfolio />} />
          <Route path="*" element={<Navigate to="/properties" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
