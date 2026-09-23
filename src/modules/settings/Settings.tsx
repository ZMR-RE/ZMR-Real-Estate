import { useState } from 'react'
import { ChartOfAccounts } from '../chartOfAccounts/ChartOfAccounts'
import { ManageOptionsPanel } from '../../shared/pickLists/ManageOptionsPanel'
import { useSettingsPickLists } from './useSettingsPickLists'
import { InstallAppSection } from './InstallAppSection'
import { AccountSecuritySection } from '../account/AccountSecuritySection'
import { ThemeToggle } from './ThemeToggle'
import { OrganizationTypesSection } from '../llcs/OrganizationTypesSection'
import { HoldingCompaniesSection } from '../holdingCompanies/HoldingCompaniesSection'
import { VendorsSection } from '../vendors/VendorsSection'

type SettingsTab = 'bookkeeping' | 'pickLists' | 'organizations' | 'accountSecurity' | 'appearance' | 'vendors'

const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'bookkeeping', label: 'Bookkeeping' },
  { key: 'pickLists', label: 'Pick lists' },
  { key: 'organizations', label: 'Organizations' },
  { key: 'accountSecurity', label: 'Account & Security' },
  { key: 'appearance', label: 'Appearance & App' },
  { key: 'vendors', label: 'Vendors' },
]

// Roadmap 12.6 — pick-list titles grouped by domain rather than one flat
// list of 17 toggle buttons. Financial/Property/Operations names match
// the roadmap item's own examples; the lists it didn't name explicitly
// (Payment how, Municipal zoning codes, County assessor use codes,
// Basement types, Street parking, Visit types) are placed by the same
// domain logic (a physical/purchase-time property attribute vs. a
// day-to-day operational activity). Vendor relationships/Vendor types
// live on the Vendors tab instead of here — they're Vendor-domain
// configuration, not a fit for any of the three named groups.
const PICK_LIST_GROUPS: { title: string; lists: string[] }[] = [
  { title: 'Financial', lists: ['Subcategories', 'Payment methods', 'Payment how'] },
  {
    title: 'Property',
    lists: [
      'Property types',
      'Municipal zoning codes',
      'Purchase methods',
      'Unit statuses',
      'County assessor use codes',
      'Basement types',
      'Street parking',
    ],
  },
  { title: 'Operations', lists: ['Task types', 'Document types', 'Contact methods', 'Listing platforms', 'Visit types'] },
]

// Roadmap 12.1 — foundational Settings shell. Houses admin-level features
// that don't belong on any single entity's page: Chart of Accounts
// (moved out of Financials & Tax, where it was only ever nested behind a
// toggle), a central home for every pick-list (8.1), and Account &
// Security (12.2, merged in here per this page's original spec). More
// sections (billing/tier) land here in later roadmap items.
//
// Roadmap 12.6 — reorganized from one long scrolling page into tabs.
// Vendors gets its own tab (not named in 12.6's text, which only lists
// Bookkeeping/Pick lists/Organizations/Account & Security/Appearance &
// App) since it doesn't conceptually fit any of those five groups —
// explicit call, not an oversight. Multi-column layout is applied where
// a tab holds multiple independent sections that would otherwise stack
// narrow and waste width (Organizations, Appearance & App) or many small
// repeated toggle buttons (Pick lists' per-domain rows, via flex-wrap
// rather than a fixed column count so the number of toggles per row
// adapts to how many actually fit). Bookkeeping/Account & Security/
// Vendors each hold one already-full-width component (a table or list),
// so forcing a second column there would cramp rather than help.
export function Settings() {
  const [tab, setTab] = useState<SettingsTab>('bookkeeping')
  const pickLists = useSettingsPickLists()

  const pickListByTitle = new Map(pickLists.map((list) => [list.title, list]))

  return (
    <div>
      <h1>Settings</h1>

      <div className="tab-bar" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'bookkeeping' && <ChartOfAccounts />}

      {tab === 'pickLists' && (
        <section>
          <h2>Pick lists</h2>
          <p>Every account-scoped dropdown option, in one place — add or archive a value without hunting down the form that uses it.</p>
          {PICK_LIST_GROUPS.map((group) => (
            <div key={group.title} className="settings-pick-list-group">
              <h3>{group.title}</h3>
              <div className="settings-pick-lists">
                {group.lists.map((title) => {
                  const list = pickListByTitle.get(title)
                  if (!list) return null
                  return (
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
                  )
                })}
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === 'organizations' && (
        <div className="settings-tab-grid">
          <OrganizationTypesSection />
          <HoldingCompaniesSection />
        </div>
      )}

      {tab === 'accountSecurity' && <AccountSecuritySection />}

      {tab === 'appearance' && (
        <div className="settings-tab-grid">
          <ThemeToggle />
          <InstallAppSection />
        </div>
      )}

      {tab === 'vendors' && <VendorsSection />}
    </div>
  )
}
