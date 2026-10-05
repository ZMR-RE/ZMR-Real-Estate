import type { MortgageDetails } from '../mortgagePayoff/mortgagePayoffQueries'
import type { PaymentRow } from '../mortgagePayoff/useMortgagePayments'
import { summarizeYearPayments } from './mortgageTabLogic'
import { useRecordedBalance } from './useRecordedBalance'
import { money, readableDate } from './presentationLogic'
export function MortgageBalancePanel({loan, payments}: {loan: MortgageDetails; payments: PaymentRow[]}) {
  const history = useRecordedBalance(loan.id, loan.principal_version)
  const year = new Date().getFullYear()
  const {summary, unlinkedCount} = summarizeYearPayments(payments.map(p => ({...p, mortgage_id: p.mortgage_id ?? null, principal_amount: Number(p.principal_amount), interest_amount: Number(p.interest_amount), history_only: p.history})), loan.id, year)
  const points = history.points
  const values = points.map(p=>p.balance)
  const min = Math.min(...values), max = Math.max(...values)
  const first = points.length ? Date.parse(points[0].at) : 0
  const span = points.length ? Math.max(1, Date.parse(points[points.length-1].at)-first) : 1
  return <section className="mortgage-panel"><h2>Balance &amp; progress</h2>
    {history.loading ? <p>Loading recorded history…</p> : history.error ? <p role="alert">{history.error}</p> : points.length === 0 ? <p className="field-hint">No principal-balance history recorded for this loan. Earlier balances are not estimated.</p> : <>
      <svg className="mortgage-recorded-chart" viewBox="0 0 620 160" role="img" aria-label="Recorded principal balances. Points only; missing history is not estimated.">
        <path d="M150 15V125H600" fill="none" stroke="var(--border)"/>
        <text x="0" y="23">{money.format(max)}</text><text x="0" y="122">{money.format(min)}</text>
        {points.map(p=><circle key={p.id} cx={points.length===1?330:155+(Date.parse(p.at)-first)/span*430} cy={max===min?70:20+(max-p.balance)/(max-min)*100} r="4" fill="var(--accent)"><title>{readableDate(p.at)} · {money.format(p.balance)} · {p.cause}</title></circle>)}
      </svg><p className="field-hint">{readableDate(points[0].at)}–{readableDate(points[points.length-1].at)} · up to 500 latest recorded changes, including corrections. These points do not identify payments.</p>
      <details><summary>View recorded balance values</summary><ul className="mortgage-balance-values">{points.slice().reverse().map(p=><li key={p.id}>{readableDate(p.at)} · {money.format(p.balance)} · {p.cause}</li>)}</ul></details>
    </>}
    {summary ? <><div className="mortgage-year-totals"><div><span>Principal paid · {year}</span><strong>{money.format(summary.principal)}</strong></div><div><span>Interest paid · {year}</span><strong>{money.format(summary.interest)}</strong></div></div><p className="field-hint">From {summary.count} recorded payments for this loan, {readableDate(summary.firstDate)}–{readableDate(summary.lastDate)}.{summary.historyOnlyCount>0 && ` Includes ${summary.historyOnlyCount} history-only entries.`}{summary.monthsWithoutPayment.length>0 && ` No payments recorded for ${summary.monthsWithoutPayment.map(m=>new Date(`${m}-01T12:00:00Z`).toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'})).join(', ')} within this range.`}</p><p className="field-hint">Mortgage payment records only. Tax and profit &amp; loss reports use Financials’ interest entries instead.</p></> : <p className="field-hint">No linked payments recorded for {year}; totals are not available.</p>}
    {unlinkedCount>0 && <p className="field-hint">{unlinkedCount} {unlinkedCount === 1 ? 'payment is' : 'payments are'} not linked to a loan and excluded from these totals.</p>}
  </section>
}
