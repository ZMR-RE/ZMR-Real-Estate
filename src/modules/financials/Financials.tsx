import { SearchableSelect } from '../../shared/SearchableSelect'
import { useFinancials } from './useFinancials'
import { TransactionForm } from './TransactionForm'
import { TransactionList } from './TransactionList'
import { FinancialsSummary } from './FinancialsSummary'

const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i)

// Self-contained screen for roadmap item 2.3 (Financials & Tax Readiness).
// Not wired into App.tsx yet — pending sign-off per the roadmap item.
export function Financials() {
  const {
    transactions,
    propertyOptions,
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
    summaryByPropertyAndCategory,
    summaryByProperty,
    exportTaxCsv,
  } = useFinancials()

  return (
    <div>
      <h1>Financials &amp; Tax Readiness</h1>
      {error && <p role="alert">{error}</p>}

      <label htmlFor="year_filter">Tax year</label>
      <select id="year_filter" value={year} onChange={(e) => setYear(Number(e.target.value))}>
        {YEAR_OPTIONS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

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

      {isFormOpen ? (
        <TransactionForm
          key={formKey}
          initialValues={formInitialValues}
          propertyOptions={propertyOptions}
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
          <TransactionList transactions={transactions} onSelect={selectTransaction} onVoid={voidEntry} />
        </>
      )}
    </div>
  )
}
