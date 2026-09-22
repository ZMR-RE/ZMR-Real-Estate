import { useFinancialAccounts } from './useFinancialAccounts'
import { FinancialAccountForm } from './FinancialAccountForm'
import { FinancialAccountList } from './FinancialAccountList'

interface FinancialAccountsSectionProps {
  propertyId: string
}

// Roadmap 7.18 — bank account(s)/credit card(s) associated with a
// property, nickname + last 4 digits only. Hard rule, no exceptions:
// never a full account/card number — enforced both here (useFinancialAccounts'
// validation) and at the DB level (the last_four check constraint).
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
    <div>
      {error && <p role="alert">{error}</p>}

      {archivedCount > 0 && (
        <label htmlFor="financial_accounts_show_archived">
          <input
            id="financial_accounts_show_archived"
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived ({archivedCount})
        </label>
      )}

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
    </div>
  )
}
