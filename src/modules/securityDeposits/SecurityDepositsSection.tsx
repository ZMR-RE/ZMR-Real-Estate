import { useSecurityDeposits, depositBalance } from './useSecurityDeposits'
import { DepositList } from './DepositList'
import { DepositForm } from './DepositForm'
import { DepositTransactionForm } from './DepositTransactionForm'

interface SecurityDepositsSectionProps {
  propertyId: string
}

// Roadmap 9.13 — security deposit tracking. Embedded on the Property
// Profile's Overview tab, scoped to this property only (a deposit belongs
// to a specific tenant/unit at a specific property, never a portfolio-wide
// list) — per the Navigation discipline rule in CLAUDE.md.
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
    <section>
      <h2>Security deposits</h2>
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
    </section>
  )
}
