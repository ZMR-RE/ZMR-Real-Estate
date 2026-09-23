import { useFinancialAccounts } from '../financialAccounts/useFinancialAccounts'
import { FinancialAccountForm } from '../financialAccounts/FinancialAccountForm'
import { FinancialAccountList } from '../financialAccounts/FinancialAccountList'

interface LlcFinancialAccountsPanelProps {
  llcId: string
}

// Roadmap 7.40 — the LLC-level counterpart to the property page's
// Financial accounts box (FinancialAccountsSection.tsx): same
// useFinancialAccounts hook, same list/form components, scoped by
// llcId instead of propertyId. Shown under the Organization Types
// expandable row in Settings, alongside the properties-assigned panel.
// Always in its own "editable" shape (add/edit/archive all visible at
// once) rather than the Box interaction standard's view/edit toggle —
// this already sits behind one click-to-expand ("View properties"), a
// second nested view/edit toggle here would be one click too many for
// what's meant to be a quick admin panel, not a primary content box.
export function LlcFinancialAccountsPanel({ llcId }: LlcFinancialAccountsPanelProps) {
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
  } = useFinancialAccounts(undefined, llcId)

  return (
    <div>
      <h4>Financial accounts</h4>
      {archivedCount > 0 && (
        <label htmlFor={`llc_financial_accounts_show_archived_${llcId}`}>
          <input
            id={`llc_financial_accounts_show_archived_${llcId}`}
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived ({archivedCount})
        </label>
      )}
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
    </div>
  )
}
