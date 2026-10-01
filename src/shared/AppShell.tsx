import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'

const NAV_ITEMS = [
  { to: '/properties', label: 'Properties' },
  { to: '/capture', label: 'Quick capture' },
  { to: '/reconciliation', label: 'Action queue' },
  { to: '/rent-ops', label: 'Rent ops' },
  { to: '/financials', label: 'Financials & tax' },
  { to: '/command-center', label: 'Command center' },
  { to: '/agents', label: 'Agents' },
  { to: '/mortgage-portfolio', label: 'Portfolio KPIs' },
]

// ISOLATED-INTEGRATION — inert in the real app (VITE_PRACTICE_TARGET is
// only ever set by envs/practice/.env, read only by
// vite.practice.config.ts); labels every page of the practice review
// server so it's never mistaken for the production dashboard.
const IS_PRACTICE = import.meta.env.VITE_PRACTICE_TARGET === 'true'

export function AppShell() {
  const { session, signOut } = useAuth()

  return (
    <div className={IS_PRACTICE ? 'app-shell app-shell--practice' : 'app-shell'}>
      {IS_PRACTICE && <div className="practice-banner">PRACTICE — fictional data, separate from your real portfolio</div>}
      <nav className="app-nav">
        <div className="app-nav-brand">ZMR Real Estate</div>
        <ul className="app-nav-links">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className={({ isActive }) => (isActive ? 'active' : '')}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="app-nav-account">
          <span>{session?.user.email}</span>
          <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
            Settings
          </NavLink>
          <button type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </nav>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
