import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { AccountSecurityMenu } from '../modules/account/AccountSecurityMenu'

const NAV_ITEMS = [
  { to: '/properties', label: 'Properties' },
  { to: '/capture', label: 'Quick capture' },
  { to: '/reconciliation', label: 'Action queue' },
  { to: '/rent-ops', label: 'Rent ops' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/financials', label: 'Financials & tax' },
  { to: '/command-center', label: 'Command center' },
  { to: '/automations', label: 'Automations' },
  { to: '/mortgage-portfolio', label: 'Portfolio KPIs' },
]

export function AppShell() {
  const { session, signOut } = useAuth()

  return (
    <div className="app-shell">
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
          <AccountSecurityMenu />
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
