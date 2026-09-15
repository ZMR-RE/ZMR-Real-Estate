import { SearchableSelect } from '../../shared/SearchableSelect'
import { useReports, YEAR_OPTIONS, type ReportTab } from './useReports'
import { BalanceSheetReport } from './BalanceSheetReport'
import { ProfitAndLossReport } from './ProfitAndLossReport'
import { CashFlowReport } from './CashFlowReport'

const TABS: { key: ReportTab; label: string }[] = [
  { key: 'balance-sheet', label: 'Balance Sheet' },
  { key: 'profit-loss', label: 'Profit & Loss' },
  { key: 'cash-flow', label: 'Cash Flow' },
]

// Roadmap 9.2/9.3/9.4 — core financial reports, grouped on one screen
// since they share the same data source (Chart of Accounts + financial
// transactions) and the same property/year scope controls. Read-only:
// nothing here changes how a transaction is entered or categorized.
export function Reports() {
  const {
    tab,
    setTab,
    year,
    setYear,
    propertyFilter,
    setPropertyFilter,
    propertyOptions,
    loading,
    error,
    balanceSheet,
    profitAndLoss,
    cashFlow,
  } = useReports()

  return (
    <div>
      <h1>Reports</h1>
      {error && <p role="alert">{error}</p>}

      <label htmlFor="report_property_filter">Property</label>
      <SearchableSelect
        options={propertyOptions}
        value={propertyFilter}
        onChange={setPropertyFilter}
        placeholder="All properties (portfolio-wide)"
      />
      {propertyFilter && (
        <button type="button" onClick={() => setPropertyFilter(null)}>
          Clear filter
        </button>
      )}

      {tab !== 'balance-sheet' && (
        <>
          <label htmlFor="report_year">Year</label>
          <select id="report_year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </>
      )}

      <div className="tab-bar" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          {tab === 'balance-sheet' && balanceSheet && <BalanceSheetReport balanceSheet={balanceSheet} />}
          {tab === 'profit-loss' && profitAndLoss && <ProfitAndLossReport profitAndLoss={profitAndLoss} year={year} />}
          {tab === 'cash-flow' && cashFlow && <CashFlowReport cashFlow={cashFlow} year={year} />}
        </>
      )}
    </div>
  )
}
