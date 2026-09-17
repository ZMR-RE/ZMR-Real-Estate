import type { ProfitAndLoss } from './reportsCalculations'

interface ProfitAndLossReportProps {
  profitAndLoss: ProfitAndLoss
  year: number
}

function money(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Every standard Schedule E line is shown, even at $0 — matching the
// real IRS form's layout, not just categories with activity this year.
// Line labels come from the Chart of Accounts (9.1) mapping for each
// category, so a renamed account shows its new name here too.
export function ProfitAndLossReport({ profitAndLoss, year }: ProfitAndLossReportProps) {
  const { incomeLines, expenseLines, totalIncome, totalExpense, netIncome } = profitAndLoss

  return (
    <div>
      <h2>Profit &amp; loss — {year}</h2>
      <p>Schedule E format.</p>

      <h3>Income</h3>
      <table>
        <tbody>
          {incomeLines.map((line) => (
            <tr key={line.category}>
              <td>{line.label}</td>
              <td>{money(line.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Total income</td>
            <td>{money(totalIncome)}</td>
          </tr>
        </tfoot>
      </table>

      <h3>Expenses</h3>
      <table>
        <tbody>
          {expenseLines.map((line) => (
            <tr key={line.category}>
              <td>{line.label}</td>
              <td>{money(line.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Total expenses</td>
            <td>{money(totalExpense)}</td>
          </tr>
        </tfoot>
      </table>

      <h3>{netIncome >= 0 ? 'Net income' : 'Net loss'}</h3>
      <p>{money(netIncome)}</p>
    </div>
  )
}
