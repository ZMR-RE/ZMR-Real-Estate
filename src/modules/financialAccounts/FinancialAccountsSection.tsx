import { useFinancialAccounts } from './useFinancialAccounts'
import { FinancialAccountForm } from './FinancialAccountForm'
import { FinancialAccountList } from './FinancialAccountList'
import { EditableSection } from '../../shared/EditableSection'

interface FinancialAccountsSectionProps {
  propertyId: string
  // Roadmap 7.40 — when this property belongs to an LLC, its shared
  // accounts are shown here too, distinguishably, read-only — editing a
  // shared account happens only from the LLC's own panel (Settings →
  // Organization Types), a single place to avoid two edit surfaces for
  // the same row.
  llcId: string | null
  llcLabel: string | null
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
export function FinancialAccountsSection({ propertyId, llcId, llcLabel }: FinancialAccountsSectionProps) {
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

  // Roadmap 7.40 — the LLC's shared accounts, read-only here regardless
  // of this box's own view/edit state. Hook only actually fetches when
  // llcId is truthy (its own effect is keyed off it), so this is a
  // no-op/empty list for an Individual-ownership property.
  const { accounts: llcAccounts, loading: llcLoading } = useFinancialAccounts(undefined, llcId ?? undefined)

  const sharedAccounts = llcId && (
    <>
      {/* Roadmap 7.42 (3) — DESIGN-SYSTEM.md's Property Information
          pattern for a second-tier heading inside an already-titled box
          is .property-details-title (see PropertySummary.tsx's own
          "Details"/"Ownership" sub-headings), not a bare <h4>. */}
      <h4 className="property-details-title">Shared — {llcLabel}</h4>
      {llcLoading ? <p>Loading…</p> : <FinancialAccountList accounts={llcAccounts} readOnly />}
    </>
  )

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
          {sharedAccounts}
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

          {sharedAccounts}
        </>
      )}
    />
  )
}
