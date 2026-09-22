import { useSecurityDeposits, depositBalance } from './useSecurityDeposits'
import { DepositList } from './DepositList'
import { DepositForm } from './DepositForm'
import { DepositTransactionForm } from './DepositTransactionForm'
import { EditableSection } from '../../shared/EditableSection'

interface SecurityDepositsSectionProps {
  propertyId: string
}

// Roadmap 9.13 — security deposit tracking. Embedded on the Property
// Profile's Overview tab, scoped to this property only (a deposit belongs
// to a specific tenant/unit at a specific property, never a portfolio-wide
// list) — per the Navigation discipline rule in CLAUDE.md.
//
// Standard rollout completeness — converted to the Box interaction
// standard's EditableSection. View state shows read-only balances/ledger
// rows; Edit reveals "Log deposit received", per-deposit "Log return /
// damages", and per-transaction "Void".
export function SecurityDepositsSection({ propertyId }: SecurityDepositsSectionProps) {
  const {
    deposits,
    loading,
    error,
    saving,
    isCreatingDeposit,
    transactionTargetId,
    startCreatingDeposit,
    cancelCreatingDeposit,
    saveNewDeposit,
    startLoggingTransaction,
    cancelLoggingTransaction,
    saveReturnOrDamages,
    voidTransaction,
    todayDateString,
  } = useSecurityDeposits(propertyId)

  const transactionTargetDeposit = deposits.find((d) => d.id === transactionTargetId) ?? null

  return (
    <EditableSection
      title="Security deposits"
      onEditStart={() => {
        cancelCreatingDeposit()
        cancelLoggingTransaction()
      }}
      view={
        <>
          {error && <p role="alert">{error}</p>}
          {loading ? <p>Loading…</p> : <DepositList deposits={deposits} readOnly onLogTransaction={() => {}} onVoidTransaction={() => {}} />}
        </>
      }
      edit={(exitEditing) => (
        <>
          {error && <p role="alert">{error}</p>}

          {isCreatingDeposit ? (
            <DepositForm
              saving={saving}
              todayDateString={todayDateString}
              onSave={saveNewDeposit}
              onCancel={cancelCreatingDeposit}
            />
          ) : (
            <button type="button" onClick={startCreatingDeposit}>
              Log deposit received
            </button>
          )}

          {transactionTargetDeposit && (
            <DepositTransactionForm
              securityDepositId={transactionTargetDeposit.id}
              balance={depositBalance(transactionTargetDeposit)}
              saving={saving}
              todayDateString={todayDateString}
              onSave={saveReturnOrDamages}
              onCancel={cancelLoggingTransaction}
            />
          )}

          {loading ? (
            <p>Loading…</p>
          ) : (
            <DepositList deposits={deposits} onLogTransaction={startLoggingTransaction} onVoidTransaction={voidTransaction} />
          )}

          <button type="button" onClick={exitEditing}>
            Done
          </button>
        </>
      )}
    />
  )
}
