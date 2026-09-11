import { useState } from 'react'
import { AccountSecurityPanel } from './AccountSecurityPanel'

// Self-contained: owns its own open/close state so the only thing a host
// page needs to do is render <AccountSecurityMenu /> — no wiring, no new
// route. Meant to sit in the account/profile area next to Sign out, per
// the Navigation discipline rule (no new top-level nav item for this).
export function AccountSecurityMenu() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="account-security-menu">
      <button type="button" onClick={() => setIsOpen((v) => !v)}>
        Account &amp; Security
      </button>
      {isOpen && <AccountSecurityPanel onClose={() => setIsOpen(false)} />}
    </div>
  )
}
