import type { BalanceSheet } from './reportsCalculations'

interface BalanceSheetReportProps {
  balanceSheet: BalanceSheet
}

function money(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// "As of today" — cumulative since inception, not scoped to a tax year
// (see reportsCalculations.computeBalanceSheet for why: assets and
// liabilities are a point-in-time position, not a period flow).
export function BalanceSheetReport({ balanceSheet }: BalanceSheetReportProps) {
  const { rows, totalMarketValue, totalCash, totalMortgageBalance, totalEquity, propertiesMissingMarketValue } =
    balanceSheet

  if (rows.length === 0) {
    return <p className="empty-state">No properties yet.</p>
  }

  return (
    <div>
      <h2>Balance sheet</h2>
      <p>As of today. Property value + cash − mortgage balance = equity.</p>

      {propertiesMissingMarketValue > 0 && (
        <p role="alert">
          {propertiesMissingMarketValue} of {rows.length} propert{propertiesMissingMarketValue === 1 ? 'y has' : 'ies have'} no
          market value on file — {propertiesMissingMarketValue === 1 ? 'its' : 'their'} equity is left blank rather than
          guessed, and {propertiesMissingMarketValue === 1 ? "it's" : "they're"} excluded from the totals below.
        </p>
      )}

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>Market value</th>
              <th>Cash</th>
              <th>Mortgage balance</th>
              <th>Equity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.propertyId}>
                <td>{row.propertyName}</td>
                <td>{row.marketValue === null ? '— not set' : money(row.marketValue)}</td>
                <td>{money(row.cash)}</td>
                <td>{money(row.mortgageBalance)}</td>
                <td>{row.equity === null ? '—' : money(row.equity)}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 1 && (
            <tfoot>
              <tr>
                <td>Total</td>
                <td>{money(totalMarketValue)}</td>
                <td>{money(totalCash)}</td>
                <td>{money(totalMortgageBalance)}</td>
                <td>{money(totalEquity)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
