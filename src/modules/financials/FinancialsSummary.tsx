import type { PropertyTotals, SummaryRow } from './financialsCalculations'

interface FinancialsSummaryProps {
  byPropertyAndCategory: SummaryRow[]
  byProperty: PropertyTotals[]
}

export function FinancialsSummary({ byPropertyAndCategory, byProperty }: FinancialsSummaryProps) {
  return (
    <div>
      <h2>Income &amp; expense by property</h2>
      {byProperty.length === 0 ? (
        <p>No activity for this filter.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>Total income</th>
              <th>Total expense</th>
              <th>Net income</th>
            </tr>
          </thead>
          <tbody>
            {byProperty.map((row) => (
              <tr key={row.propertyId}>
                <td>{row.propertyName}</td>
                <td>${row.totalIncome.toFixed(2)}</td>
                <td>${row.totalExpense.toFixed(2)}</td>
                <td>${row.netIncome.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>By property and category</h2>
      {byPropertyAndCategory.length === 0 ? (
        <p>No activity for this filter.</p>
      ) : (
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
                <td>${row.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
