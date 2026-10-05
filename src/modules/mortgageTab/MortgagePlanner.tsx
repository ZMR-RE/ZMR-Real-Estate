import { useState } from 'react'
import { CollapsibleSection } from '../../shared/CollapsibleSection'
import type { MortgageDetails } from '../mortgagePayoff/mortgagePayoffQueries'
import { computePayoffScenario, type ExtraPaymentMode, type PayoffScenarioResult } from '../mortgagePayoff/mortgagePayoffMath'
import { money, readableDate, projectedBalances } from './presentationLogic'
const month = (date: Date) => date.toLocaleDateString('en-US', {month: 'long', year: 'numeric'})
export function MortgagePlanner({loan}: {loan: MortgageDetails}) {
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState<ExtraPaymentMode>('recurring')
  const [computed, setComputed] = useState<{key: string; result: PayoffScenarioResult | null; error: string | null} | null>(null)
  const balance = Number(loan.current_balance), rate = Number(loan.interest_rate), payment = Number(loan.monthly_payment)
  const key = JSON.stringify([loan.id,loan.principal_version,balance,rate,payment,amount,mode])
  const current = computed?.key===key ? computed : null
  const result = current?.result
  function calculate() {
    const extra = Number(amount)
    if (!Number.isFinite(extra) || extra<=0) {setComputed({key,result:null,error:'Enter a positive extra principal amount.'}); return}
    const value = computePayoffScenario({balance, annualRatePercent:rate, monthlyPayment:payment, extraAmount:extra, extraMode:mode})
    setComputed({key,result:value,error:value?null:'The current payment does not pay off this balance. Check the loan details.'})
  }
  const normal = result ? projectedBalances({balance,annualRatePercent:rate,monthlyPayment:payment}) : []
  const extra = result ? projectedBalances({balance:mode==='oneTime'?Math.max(0,balance-Number(amount)):balance,annualRatePercent:rate,monthlyPayment:mode==='recurring'?payment+Number(amount):payment}) : []
  const path = (points: number[]) => points.map((n,i)=>`${i?'L':'M'}${45+i/Math.max(1,normal.length-1)*420},${15+(1-n/Math.max(balance,1))*145}`).join(' ')
  return <CollapsibleSection title="Mortgage payoff planner"><p className="field-hint"><span className="status-badge status-badge-neutral">Projection</span> Starts from the current recorded balance, {money.format(balance)}, at {rate}% with {money.format(payment)} monthly principal and interest. {loan.principal_as_of ? `Last statement date: ${readableDate(loan.principal_as_of)}; the balance includes changes recorded since that statement.` : 'Statement date not recorded.'} Confirm the recorded balance is current before using this projection.</p>
    <form className="mortgage-planner-controls" onSubmit={e=>{e.preventDefault();calculate()}}><label>Extra principal ($)<input type="number" min="0.01" step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>Frequency<select value={mode} onChange={e=>setMode(e.target.value as ExtraPaymentMode)}><option value="recurring">Every month</option><option value="oneTime">One time</option></select></label><button type="submit">Calculate</button></form>
    {current?.error && <p role="alert">{current.error}</p>}
    {result && <><p className="mortgage-planner-saving">{result.monthsSaved} months sooner · {money.format(result.interestSaved)} less interest</p><div className="mortgage-planner-result"><div className="mortgage-plan-comparison">{[['Current plan',result.original,result.originalPayoffDate],['With extra principal',result.accelerated,result.acceleratedPayoffDate]].map(([title,plan,date])=>{const p=plan as typeof result.original;return <section className="mortgage-plan" key={String(title)}><h3>{String(title)}</h3><dl><dt>Payoff</dt><dd>{month(date as Date)}</dd><dt>Time remaining</dt><dd>{Math.floor(p.months/12)} yr {p.months%12} mo</dd><dt>Remaining interest</dt><dd>{money.format(p.totalInterest)}</dd></dl></section>})}</div><div><svg className="mortgage-projection-chart" viewBox="0 0 500 190" role="img" aria-label="Projected principal balances: current plan and extra-payment plan"><path d="M45 15V160H470" fill="none" stroke="var(--border)"/><text x="0" y="13">{money.format(balance)}</text><text x="12" y="160">$0</text><path d={path(normal)} fill="none" stroke="var(--accent)" strokeWidth="3"/><path d={path(extra)} fill="none" stroke="var(--success)" strokeWidth="3" strokeDasharray="7 4"/><text x="45" y="184">Now</text><text x="350" y="184">{month(result.originalPayoffDate)}</text></svg><p className="field-hint">Solid: current plan · Dashed: extra-payment plan</p></div></div><p className="field-hint">Monthly amortization at the recorded rate; excludes fees, penalties, escrow and daily-interest adjustments. Dates project from today using the recorded balance; a lender payoff quote may differ.</p></>}
    <p className="field-hint">Scenarios are temporary. Nothing is saved or recorded as paid. Recalculate after changing inputs.</p>
  </CollapsibleSection>
}
