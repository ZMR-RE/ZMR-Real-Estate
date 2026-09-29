import { formatMoney, type CapitalImprovementRow, type PropertyTotals, type SummaryRow } from './financialsCalculations'

interface FinancialsSummaryProps {
  byPropertyAndCategory: SummaryRow[]
  byProperty: PropertyTotals[]
  capitalImprovements: CapitalImprovementRow[]
}

// M5 — operating results and capital spending are shown side by side but
// never merged: "Net operating income" matches the P&L; "Net after all
// spending" also subtracts capital improvements, so the two numbers are
// explicitly different rather than silently disagreeing.
export function FinancialsSummary({ byPropertyAndCategory, byProperty, capitalImprovements }: FinancialsSummaryProps) {
  return (
    <div>
      <h2>Income &amp; expense by property</h2>
      {byProperty.length === 0 ? (
        <p className="empty-state">No activity for this filter.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Property</th>
                <th>Income</th>
                <th>Operating expenses</th>
                <th>Net operating income</th>
                <th>Capital improvements</th>
                <th>Net after all spending</th>
              </tr>
            </thead>
            <tbody>
              {byProperty.map((row) => (
                <tr key={row.propertyId}>
                  <td>{row.propertyName}</td>
                  <td>{formatMoney(row.income)}</td>
                  <td>{formatMoney(row.operatingExpense)}</td>
                  <td>{formatMoney(row.netOperating)}</td>
                  <td>{formatMoney(row.capitalImprovements)}</td>
                  <td>{formatMoney(row.netAfterAllSpending)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>By property and category</h2>
      {byPropertyAndCategory.length === 0 ? (
        <p className="empty-state">No activity for this filter.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Property</th>
                <th>Type</th>
                <th>Category</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {byPropertyAndCategory.map((row) => (
                <tr key={`${row.propertyId}:${row.category}`}>
                  <td>{row.propertyName}</td>
                  <td>{row.entryType === 'income' ? 'Income' : 'Expense'}</td>
                  <td>{row.categoryLabel}</td>
                  <td>{formatMoney(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {capitalImprovements.length > 0 && (
        <>
          <h2>Capital improvements</h2>
          <p className="field-hint">Not included in the expense categories above or in net operating income.</p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Transactions</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {capitalImprovements.map((row) => (
                  <tr key={row.propertyId}>
                    <td>{row.propertyName}</td>
                    <td>{row.count}</td>
                    <td>{formatMoney(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
