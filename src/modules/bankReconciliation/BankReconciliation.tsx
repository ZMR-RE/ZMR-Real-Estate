import { SearchableSelect } from '../../shared/SearchableSelect'
import { useBankReconciliation } from './useBankReconciliation'
import { BankReconciliationTransactionList } from './BankReconciliationTransactionList'
import { BankReconciliationSummary } from './BankReconciliationSummary'

export function BankReconciliation() {
  const {
    propertyOptions,
    propertyId,
    setPropertyId,
    periodStart,
    setPeriodStart,
    periodEnd,
    setPeriodEnd,
    startingBalance,
    setStartingBalance,
    endingBalance,
    setEndingBalance,
    transactions,
    selectedIds,
    toggleTransaction,
    loading,
    error,
    saving,
    result,
    hasEnteredBalances,
    canMarkReconciled,
    markReconciled,
  } = useBankReconciliation()

  return (
    <section>
      <h2>Bank Reconciliation</h2>
      <p>Match a bank/credit-card statement period against Financials transactions and surface any discrepancy.</p>
      {error && <p role="alert">{error}</p>}

      <label htmlFor="bank_rec_property">Property</label>
      <SearchableSelect
        options={propertyOptions}
        value={propertyId}
        onChange={setPropertyId}
        placeholder="Search properties…"
      />

      <label htmlFor="bank_rec_period_start">Statement period start</label>
      <input
        id="bank_rec_period_start"
        type="date"
        value={periodStart}
        onChange={(e) => setPeriodStart(e.target.value)}
      />

      <label htmlFor="bank_rec_period_end">Statement period end</label>
      <input id="bank_rec_period_end" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />

      <label htmlFor="bank_rec_starting_balance">Starting balance</label>
      <input
        id="bank_rec_starting_balance"
        type="number"
        step="0.01"
        value={startingBalance}
        onChange={(e) => setStartingBalance(e.target.value)}
      />

      <label htmlFor="bank_rec_ending_balance">Ending statement balance</label>
      <input
        id="bank_rec_ending_balance"
        type="number"
        step="0.01"
        value={endingBalance}
        onChange={(e) => setEndingBalance(e.target.value)}
      />

      {!propertyId ? (
        <p>Select a property to load its transactions for this period.</p>
      ) : loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <BankReconciliationTransactionList
            transactions={transactions}
            selectedIds={selectedIds}
            onToggle={toggleTransaction}
          />
          <BankReconciliationSummary
            startingBalance={startingBalance}
            endingBalance={endingBalance}
            result={result}
            hasEnteredBalances={hasEnteredBalances}
            canMarkReconciled={canMarkReconciled}
            saving={saving}
            onMarkReconciled={markReconciled}
          />
        </>
      )}
    </section>
  )
}
