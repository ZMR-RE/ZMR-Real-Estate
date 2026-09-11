import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { AccountSecurityMenu } from '../modules/account/AccountSecurityMenu'

const NAV_ITEMS = [
  { to: '/properties', label: 'Properties' },
  { to: '/capture', label: 'Log It' },
  { to: '/reconciliation', label: 'Action Queue' },
  { to: '/rent-ops', label: 'Rent Ops' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/financials', label: 'Financials & Tax' },
  { to: '/command-center', label: 'Command Center' },
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
