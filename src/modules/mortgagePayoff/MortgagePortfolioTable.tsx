import type { PortfolioMortgageEntry } from './mortgagePayoffMath'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
})

interface MortgagePortfolioTableProps {
  entries: PortfolioMortgageEntry[]
}

export function MortgagePortfolioTable({ entries }: MortgagePortfolioTableProps) {
  if (entries.length === 0) {
    return <p>No mortgages recorded yet.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Property</th>
          <th>Balance</th>
          <th>Market value</th>
          <th>Equity</th>
          <th>LTV</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.propertyId}>
            <td>{entry.propertyName}</td>
            <td>{currencyFormatter.format(entry.currentBalance)}</td>
            <td>{entry.marketValue !== null ? currencyFormatter.format(entry.marketValue) : '—'}</td>
            <td>
              {entry.marketValue !== null
                ? currencyFormatter.format(entry.marketValue - entry.currentBalance)
                : '—'}
            </td>
            <td>
              {entry.marketValue !== null && entry.marketValue > 0
                ? percentFormatter.format(entry.currentBalance / entry.marketValue)
                : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
