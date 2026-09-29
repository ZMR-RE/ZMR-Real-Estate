import { formatMoney } from '../financials/financialsCalculations'
import type { CashFlow } from './reportsCalculations'

interface CashFlowReportProps {
  cashFlow: CashFlow
  year: number
}

const money = formatMoney

// Deliberately not the same number as P&L's net income: depreciation is
// added back, and mortgage principal and capital improvements are
// subtracted (money that left the bank account without being P&L
// expense) — see reportsCalculations.computeCashFlow.
export function CashFlowReport({ cashFlow, year }: CashFlowReportProps) {
  const { netIncome, depreciationAddBack, cashFromOperations, principalPaid, capitalImprovementsPaid, netCashFlow } = cashFlow

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
            <tr>
              <td>− Capital improvements paid</td>
              <td>{money(capitalImprovementsPaid)}</td>
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
