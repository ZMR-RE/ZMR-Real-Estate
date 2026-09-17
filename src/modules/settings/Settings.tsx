import { ChartOfAccounts } from '../chartOfAccounts/ChartOfAccounts'
import { ManageOptionsPanel } from '../../shared/pickLists/ManageOptionsPanel'
import { useSettingsPickLists } from './useSettingsPickLists'
import { InstallAppSection } from './InstallAppSection'
import { AccountSecuritySection } from '../account/AccountSecuritySection'
import { ThemeToggle } from './ThemeToggle'
import { OrganizationTypesSection } from '../llcs/OrganizationTypesSection'
import { HoldingCompaniesSection } from '../holdingCompanies/HoldingCompaniesSection'

// Roadmap 12.1 — foundational Settings shell. Houses admin-level features
// that don't belong on any single entity's page: Chart of Accounts
// (moved out of Financials & Tax, where it was only ever nested behind a
// toggle), a central home for every pick-list (8.1), and Account &
// Security (12.2, merged in here per this page's original spec). More
// sections (billing/tier) land here in later roadmap items.
export function Settings() {
  const pickLists = useSettingsPickLists()

  return (
    <div>
      <h1>Settings</h1>

      <section>
        <ChartOfAccounts />
      </section>

      <section>
        <h2>Pick lists</h2>
        <p>Every account-scoped dropdown option, in one place — add or archive a value without hunting down the form that uses it.</p>
        <div className="settings-pick-lists">
          {pickLists.map((list) => (
            <ManageOptionsPanel
              key={list.title}
              title={list.title}
              options={list.options}
              loading={list.loading}
              error={list.error}
              saving={list.saving}
              onAdd={list.add}
              onArchive={list.archive}
              onRestore={list.restore}
            />
          ))}
        </div>
      </section>

      <OrganizationTypesSection />

      <HoldingCompaniesSection />

      <AccountSecuritySection />

      <ThemeToggle />

      <InstallAppSection />
    </div>
  )
}
