import { useChartOfAccounts } from './useChartOfAccounts'
import { AccountList } from './AccountList'
import { AccountForm } from './AccountForm'
import { CategoryMappingList } from './CategoryMappingList'

// Roadmap item 9.1 — Chart of Accounts screen. Preloaded per-account by
// the seed_default_chart_of_accounts() trigger (see migration
// 20260910210000_chart_of_accounts.sql). Every Financials (2.3) category
// mapping shown here is real, user-editable data — never hidden system
// logic — per CLAUDE.md's Bookkeeping rule.
export function ChartOfAccounts() {
  const {
    accounts,
    mappingRows,
    loading,
    error,
    saving,
    isAddingAccount,
    editingAccountId,
    formInitialValues,
    isAccountFormOpen,
    startAddingAccount,
    startEditingAccount,
    cancelAccountForm,
    saveAccount,
    savingMappingId,
    setPendingMapping,
    cancelMappingEdit,
    saveMappingEdit,
  } = useChartOfAccounts()

  if (loading) {
    return <p>Loading…</p>
  }

  return (
    <div>
      <h2>Chart of Accounts</h2>
      {error && <p role="alert">{error}</p>}

      <h2>Accounts</h2>
      <AccountList accounts={accounts} editingAccountId={editingAccountId} onEdit={startEditingAccount} />

      {isAccountFormOpen ? (
        <AccountForm
          key={editingAccountId ?? 'new'}
          initialValues={formInitialValues}
          saving={saving}
          isNew={isAddingAccount}
          onSave={saveAccount}
          onCancel={cancelAccountForm}
        />
      ) : (
        <button type="button" onClick={startAddingAccount}>
          Add account
        </button>
      )}

      <h2>Category mapping</h2>
      <p>Every Financials transaction category maps to one of the accounts above. Remap a category by choosing a different account, then Save.</p>
      <CategoryMappingList
        rows={mappingRows}
        accounts={accounts}
        savingMappingId={savingMappingId}
        onChange={setPendingMapping}
        onSave={saveMappingEdit}
        onCancel={cancelMappingEdit}
      />
    </div>
  )
}
