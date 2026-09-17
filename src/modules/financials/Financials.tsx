import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SearchableSelect } from '../../shared/SearchableSelect'
import { MileageRollup } from '../mileage/MileageRollup'
import { BankReconciliation } from '../bankReconciliation/BankReconciliation'
import { FinancialPeriodLockControl } from '../financialPeriods/FinancialPeriodLockControl'
import { VendorSplitRules } from '../vendors/VendorSplitRules'
import { useFinancials } from './useFinancials'
import { TransactionForm } from './TransactionForm'
import { TransactionList } from './TransactionList'
import { TransactionListExport } from './TransactionListExport'
import { FinancialsSummary } from './FinancialsSummary'

const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i)

// Self-contained screen for roadmap item 2.3 (Financials & Tax Readiness).
// Not wired into App.tsx yet — pending sign-off per the roadmap item.
export function Financials() {
  const [isReconciling, setIsReconciling] = useState(false)
  const [isManagingSplitRules, setIsManagingSplitRules] = useState(false)
  const {
    transactions,
    propertyOptions,
    vendorOptions,
    createVendor,
    propertyFilter,
    setPropertyFilter,
    year,
    setYear,
    loading,
    error,
    isFormOpen,
    formKey,
    formInitialValues,
    saving,
    startCreating,
    selectTransaction,
    cancelForm,
    save,
    voidEntry,
    applySplit,
    reimbursedSourceIds,
    summaryByPropertyAndCategory,
    summaryByProperty,
    exportTaxCsv,
  } = useFinancials()

  return (
    <div>
      <h1>Financials &amp; tax readiness</h1>
      {error && <p role="alert">{error}</p>}

      <label htmlFor="year_filter">Tax year</label>
      <select id="year_filter" value={year} onChange={(e) => setYear(Number(e.target.value))}>
        {YEAR_OPTIONS.map((y) => (
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

      {isFormOpen ? (
        <TransactionForm
          key={formKey}
          initialValues={formInitialValues}
          propertyOptions={propertyOptions}
          vendorOptions={vendorOptions}
          onCreateVendor={createVendor}
          saving={saving}
          onSave={save}
          onCancel={cancelForm}
        />
      ) : (
        <button type="button" onClick={startCreating}>
          Add transaction
        </button>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <FinancialsSummary byPropertyAndCategory={summaryByPropertyAndCategory} byProperty={summaryByProperty} />
          <MileageRollup year={year} />
          <TransactionListExport transactions={transactions} year={year} />
          <TransactionList
            transactions={transactions}
            onSelect={selectTransaction}
            onVoid={voidEntry}
            onApplySplit={applySplit}
            reimbursedSourceIds={reimbursedSourceIds}
            applyingSplit={saving}
          />
        </>
      )}
    </div>
  )
}
