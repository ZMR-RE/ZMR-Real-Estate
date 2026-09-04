import type { PayoffScenarioResult } from './mortgagePayoffMath'

interface MortgagePayoffResultsProps {
  result: PayoffScenarioResult
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })

function formatDuration(months: number): string {
  const years = Math.floor(months / 12)
  const remainder = months % 12
  const parts: string[] = []
  if (years > 0) parts.push(`${years} yr${years === 1 ? '' : 's'}`)
  if (remainder > 0) parts.push(`${remainder} mo${remainder === 1 ? '' : 's'}`)
  return parts.length > 0 ? parts.join(' ') : '0 mos'
}

export function MortgagePayoffResults({ result }: MortgagePayoffResultsProps) {
  const { original, accelerated, monthsSaved, interestSaved, originalPayoffDate, acceleratedPayoffDate } = result

  return (
    <div className="mortgage-payoff-results">
      <h2>Scenario result</h2>

      <table>
        <thead>
          <tr>
            <th></th>
            <th>Current schedule</th>
            <th>With extra payment</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Payoff date</td>
            <td>{dateFormatter.format(originalPayoffDate)}</td>
            <td>{dateFormatter.format(acceleratedPayoffDate)}</td>
          </tr>
          <tr>
            <td>Time to pay off</td>
            <td>{formatDuration(original.months)}</td>
            <td>{formatDuration(accelerated.months)}</td>
          </tr>
          <tr>
            <td>Remaining interest</td>
            <td>{currencyFormatter.format(original.totalInterest)}</td>
            <td>{currencyFormatter.format(accelerated.totalInterest)}</td>
          </tr>
        </tbody>
      </table>

      <p className="mortgage-payoff-summary">
        Paying off <strong>{formatDuration(Math.max(monthsSaved, 0))}</strong> sooner saves{' '}
        <strong>{currencyFormatter.format(Math.max(interestSaved, 0))}</strong> in interest.
      </p>
    </div>
  )
}
