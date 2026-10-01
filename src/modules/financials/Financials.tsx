import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SearchableSelect } from '../../shared/SearchableSelect'
import { MileageRollup } from '../mileage/MileageRollup'
import { BankReconciliation } from '../bankReconciliation/BankReconciliation'
import { FinancialPeriodLockControl } from '../financialPeriods/FinancialPeriodLockControl'
import { VendorSplitRules } from '../vendors/VendorSplitRules'
import { HistoricalImportWizard } from '../historicalImport/HistoricalImportWizard'
import { useFinancials } from './useFinancials'
import { TransactionForm } from './TransactionForm'
import { TransactionList } from './TransactionList'
import { TransactionListExport } from './TransactionListExport'
import { FinancialsSummary } from './FinancialsSummary'
import { useTransactionEntry } from './useTransactionEntry'
import { formatMoney } from './financialsCalculations'
import { formatDateOnly } from '../../shared/dateFormat'

// Roadmap item 2.3 (Financials & Tax Readiness), routed at /financials.
export function Financials() {
  const [isReconciling, setIsReconciling] = useState(false)
  const [isManagingSplitRules, setIsManagingSplitRules] = useState(false)
  const [isImportingHistorical, setIsImportingHistorical] = useState(false)
  const {
    transactions,
    voidedTransactions,
    showVoided,
    setShowVoided,
    propertyOptions,
    vendorOptions,
    createVendor,
    propertyFilter,
    setPropertyFilter,
    year,
    setYear,
    yearOptions,
    loading,
    error,
    saving,
    voidEntry,
    applySplit,
    reimbursedSourceIds,
    capturedTransactionIds,
    summaryByPropertyAndCategory,
    summaryByProperty,
    capitalImprovements,
    exportTaxCsv,
    refreshTransactions,
    refreshYears,
    revealTransaction,
  } = useFinancials()

  const entry = useTransactionEntry({
    propertyLabelFor: (id) => propertyOptions.find((p) => p.id === id)?.label ?? 'property',
    onSaved: async ({ year: savedYear, propertyId }) => {
      const moved = revealTransaction(savedYear, propertyId)
      await Promise.all([refreshTransactions(), refreshYears()])
      return moved
    },
  })

  // M3 — sensible focus after the form closes: back to the row's Edit
  // button for an edit, otherwise to "Add transaction". Applied in an
  // effect once the form has actually unmounted (the target button only
  // exists after that render), not on a timer.
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const pendingFocus = useRef<{ editedId: string | null } | null>(null)
  const returnFocus = (editedId: string | null) => {
    pendingFocus.current = { editedId }
  }
  useEffect(() => {
    if (entry.entry.mode !== 'closed' || !pendingFocus.current) return
    const { editedId } = pendingFocus.current
    pendingFocus.current = null
    const target = editedId ? document.querySelector<HTMLElement>(`[data-edit-transaction="${editedId}"]`) : null
    ;(target ?? addButtonRef.current)?.focus()
  })
  const editingId = entry.entry.mode === 'edit' ? entry.entry.transaction.id : null
  const editing = entry.entry.mode === 'edit' ? entry.entry.transaction : null

  return (
    <div>
      <h1>Financials &amp; tax readiness</h1>
      {error && <p role="alert">{error}</p>}

      <label htmlFor="year_filter">Tax year</label>
      <select id="year_filter" value={year} onChange={(e) => setYear(Number(e.target.value))}>
        {yearOptions.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <FinancialPeriodLockControl year={year} />

      <label htmlFor="property_filter">Filter by property</label>
      <SearchableSelect
        options={propertyOptions}
        value={propertyFilter}
        onChange={setPropertyFilter}
        placeholder="All properties"
      />
      {propertyFilter && (
        <button type="button" onClick={() => setPropertyFilter(null)}>
          Clear filter
        </button>
      )}

      <button type="button" onClick={exportTaxCsv} disabled={transactions.length === 0}>
        Export tax-ready CSV
      </button>

      <p>
        <Link to="/settings">Manage chart of accounts</Link> (moved to Settings)
      </p>

      <p>
        <Link to="/reports">Balance sheet, profit &amp; loss, and cash flow reports</Link>
      </p>

      <button type="button" onClick={() => setIsReconciling((v) => !v)}>
        {isReconciling ? 'Hide bank reconciliation' : 'Reconcile with bank statement'}
      </button>
      {isReconciling && <BankReconciliation />}

      <button type="button" onClick={() => setIsManagingSplitRules((v) => !v)}>
        {isManagingSplitRules ? 'Hide vendor split rules' : 'Manage vendor split rules'}
      </button>
      {isManagingSplitRules && <VendorSplitRules />}

      <button type="button" onClick={() => setIsImportingHistorical((v) => !v)}>
        {isImportingHistorical ? 'Hide historical data import' : 'Import historical data'}
      </button>
      {isImportingHistorical && (
        <HistoricalImportWizard
          onClose={() => {
            setIsImportingHistorical(false)
            refreshTransactions()
          }}
        />
      )}

      {entry.message?.kind === 'saved' && (
        <p className="success-message" role="status">
          {entry.message.text}
        </p>
      )}

      {entry.initialValues ? (
        <TransactionForm
          key={entry.formKey}
          mode={entry.entry.mode === 'edit' ? 'edit' : 'new'}
          heading={
            editing
              ? `Edit transaction — ${formatDateOnly(editing.transaction_date)}, ${formatMoney(Number(editing.amount))}`
              : 'Add transaction'
          }
          continuing={entry.entry.mode === 'new' && entry.initialValues.propertyId !== ''}
          initialValues={entry.initialValues}
          propertyOptions={propertyOptions}
          vendorOptions={vendorOptions}
          onCreateVendor={createVendor}
          saving={entry.saving}
          message={entry.message}
          storedTenantName={editing?.tenant?.name}
          onSave={async (input, addAnother) => {
            const saved = await entry.save(input, addAnother)
            if (saved && !addAnother) returnFocus(editingId)
            return saved
          }}
          onCancel={() => {
            entry.close()
            returnFocus(editingId)
          }}
        />
      ) : (
        <button type="button" ref={addButtonRef} onClick={entry.startCreating}>
          Add transaction
        </button>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <FinancialsSummary
            byPropertyAndCategory={summaryByPropertyAndCategory}
            byProperty={summaryByProperty}
            capitalImprovements={capitalImprovements}
          />
          <MileageRollup year={year} />
          <TransactionListExport transactions={transactions} year={year} />
          <label htmlFor="show_voided">
            <input id="show_voided" type="checkbox" checked={showVoided} onChange={(e) => setShowVoided(e.target.checked)} />
            Show voided
          </label>
          <TransactionList
            transactions={transactions}
            voidedTransactions={showVoided ? voidedTransactions : []}
            onSelect={entry.startEditing}
            onVoid={voidEntry}
            onApplySplit={applySplit}
            reimbursedSourceIds={reimbursedSourceIds}
            capturedTransactionIds={capturedTransactionIds}
            applyingSplit={saving}
          />
        </>
      )}
    </div>
  )
}
