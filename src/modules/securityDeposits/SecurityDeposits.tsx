import { useSecurityDeposits, depositBalance } from './useSecurityDeposits'
import { DepositList } from './DepositList'
import { DepositForm } from './DepositForm'
import { DepositTransactionForm } from './DepositTransactionForm'

export function SecurityDeposits() {
  const {
    deposits,
    propertyOptions,
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
  } = useSecurityDeposits()

  const transactionTargetDeposit = deposits.find((d) => d.id === transactionTargetId) ?? null

  return (
    <div>
      <h1>Security Deposits</h1>
      {error && <p role="alert">{error}</p>}

      {isCreatingDeposit ? (
        <DepositForm
          propertyOptions={propertyOptions}
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
    </div>
  )
}
