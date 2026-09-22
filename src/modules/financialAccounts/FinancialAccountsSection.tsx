import { useFinancialAccounts } from './useFinancialAccounts'
import { FinancialAccountForm } from './FinancialAccountForm'
import { FinancialAccountList } from './FinancialAccountList'
import { EditableSection } from '../../shared/EditableSection'

interface FinancialAccountsSectionProps {
  propertyId: string
}

// Roadmap 7.18 — bank account(s)/credit card(s) associated with a
// property, nickname + last 4 digits only. Hard rule, no exceptions:
// never a full account/card number — enforced both here (useFinancialAccounts'
// validation) and at the DB level (the last_four check constraint).
//
// Roadmap 7.25 — converted to the Box interaction standard's
// EditableSection: view state shows a read-only list (no per-row
// actions); clicking the box's own Edit reveals the interactive list
// (Edit/Archive per row) plus "+ Add financial account", replacing the
// old always-visible Add button below the list. "Show archived" stays
// a secondaryAction — always visible regardless of view/edit state,
// same as before this conversion (7.23).
export function FinancialAccountsSection({ propertyId }: FinancialAccountsSectionProps) {
  const {
    accounts,
    archivedCount,
    showArchived,
    setShowArchived,
    loading,
    error,
    isAdding,
    editingId,
    saving,
    startAdding,
    startEditing,
    cancelForm,
    add,
    save,
    toggleArchived,
  } = useFinancialAccounts(propertyId)

  return (
    <EditableSection
      title="Financial accounts"
      onEditStart={cancelForm}
      secondaryActions={
        archivedCount > 0 && (
          <label htmlFor="financial_accounts_show_archived">
            <input
              id="financial_accounts_show_archived"
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show archived ({archivedCount})
          </label>
        )
      }
      view={
        <>
          {error && <p role="alert">{error}</p>}
          {loading ? <p>Loading…</p> : <FinancialAccountList accounts={accounts} readOnly />}
        </>
      }
      edit={(exitEditing) => (
        <>
          {error && <p role="alert">{error}</p>}

          {loading ? (
            <p>Loading…</p>
          ) : (
            <FinancialAccountList
              accounts={accounts}
              editingId={editingId}
              saving={saving}
              onStartEditing={startEditing}
              onSave={save}
              onCancel={cancelForm}
              onToggleArchived={toggleArchived}
            />
          )}

          {isAdding ? (
            <FinancialAccountForm saving={saving} onSave={add} onCancel={cancelForm} />
          ) : (
            <button type="button" onClick={startAdding}>
              + Add financial account
            </button>
          )}

          <button type="button" onClick={exitEditing}>
            Done
          </button>
        </>
      )}
    />
  )
}
