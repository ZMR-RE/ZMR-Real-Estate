import type { CashFlow } from './reportsCalculations'

interface CashFlowReportProps {
  cashFlow: CashFlow
  year: number
}

function money(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Deliberately not the same number as P&L's net income: depreciation is
// added back (a P&L expense that never left the bank account) and
// mortgage principal is subtracted (money that left the bank account
// without ever being a P&L expense) — see reportsCalculations.computeCashFlow.
export function CashFlowReport({ cashFlow, year }: CashFlowReportProps) {
  const { netIncome, depreciationAddBack, cashFromOperations, principalPaid, netCashFlow } = cashFlow

  return (
    <div>
      <h2>Cash flow — {year}</h2>

      <div className="table-scroll">
        <table>
          <tbody>
            <tr>
              <td>Net income (from Profit &amp; Loss)</td>
              <td>{money(netIncome)}</td>
            </tr>
            <tr>
              <td>+ Depreciation (non-cash, added back)</td>
              <td>{money(depreciationAddBack)}</td>
            </tr>
            <tr>
              <td>= Cash from operations</td>
              <td>{money(cashFromOperations)}</td>
            </tr>
            <tr>
              <td>− Mortgage principal paid</td>
              <td>{money(principalPaid)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td>Net cash flow</td>
              <td>{money(netCashFlow)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
