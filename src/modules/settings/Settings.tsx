import { ChartOfAccounts } from '../chartOfAccounts/ChartOfAccounts'
import { ManageOptionsPanel } from '../../shared/pickLists/ManageOptionsPanel'
import { useSettingsPickLists } from './useSettingsPickLists'

// Roadmap 12.1 — foundational Settings shell. Houses admin-level features
// that don't belong on any single entity's page: Chart of Accounts
// (moved out of Financials & Tax, where it was only ever nested behind a
// toggle) and a central home for every pick-list (8.1), instead of each
// being reachable only from whichever form happens to embed it. More
// sections (billing/tier, security) land here in later roadmap items —
// this pass just establishes the page and its first two sections.
export function Settings() {
  const pickLists = useSettingsPickLists()

  return (
    <div>
      <h1>Settings</h1>

      <section>
        <ChartOfAccounts />
      </section>

      <section>
        <h2>Pick Lists</h2>
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
    </div>
  )
}
