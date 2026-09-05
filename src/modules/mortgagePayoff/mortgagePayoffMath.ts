const MAX_MONTHS = 1200 // 100-year safety cap against runaway loops on bad inputs

export interface AmortizationInput {
  balance: number
  annualRatePercent: number
  monthlyPayment: number
}

export interface AmortizationResult {
  months: number
  totalInterest: number
}

/**
 * Simulates a fixed-payment amortization schedule month by month (rather than
 * the closed-form log formula) so the final, smaller-than-usual payment is
 * handled correctly and interest totals stay exact.
 */
export function simulatePayoff({
  balance,
  annualRatePercent,
  monthlyPayment,
}: AmortizationInput): AmortizationResult | null {
  if (balance < 0 || monthlyPayment <= 0 || annualRatePercent < 0) return null
  if (balance === 0) return { months: 0, totalInterest: 0 }

  const monthlyRate = annualRatePercent / 100 / 12
  let remaining = balance
  let totalInterest = 0
  let months = 0

  while (remaining > 0) {
    if (months >= MAX_MONTHS) return null // payment never covers interest at this rate

    const interest = remaining * monthlyRate
    const principalPortion = monthlyPayment - interest

    if (principalPortion <= 0) return null // payment doesn't even cover interest

    months += 1
    totalInterest += interest

    remaining = principalPortion >= remaining ? 0 : remaining - principalPortion
  }

  return { months, totalInterest }
}

export type ExtraPaymentMode = 'recurring' | 'oneTime'

export interface PayoffScenarioInput {
  balance: number
  annualRatePercent: number
  monthlyPayment: number
  extraAmount: number
  extraMode: ExtraPaymentMode
}

export interface PayoffScenarioResult {
  original: AmortizationResult
  accelerated: AmortizationResult
  monthsSaved: number
  interestSaved: number
  originalPayoffDate: Date
  acceleratedPayoffDate: Date
}

export function payoffDateFromMonths(months: number, from: Date = new Date()): Date {
  return new Date(from.getFullYear(), from.getMonth() + months, 1)
}

/**
 * Returns null when either schedule can't be simulated (e.g. the current
 * payment doesn't cover monthly interest at the given rate) — callers should
 * show a validation message rather than a result in that case.
 */
export function computePayoffScenario(input: PayoffScenarioInput): PayoffScenarioResult | null {
  const original = simulatePayoff({
    balance: input.balance,
    annualRatePercent: input.annualRatePercent,
    monthlyPayment: input.monthlyPayment,
  })

  // A one-time extra payment reduces the starting balance immediately and
  // keeps the regular payment unchanged; a recurring extra payment keeps the
  // balance as-is and raises the payment every month going forward.
  const acceleratedBalance =
    input.extraMode === 'oneTime' ? Math.max(input.balance - input.extraAmount, 0) : input.balance
  const acceleratedPayment =
    input.extraMode === 'recurring' ? input.monthlyPayment + input.extraAmount : input.monthlyPayment

  const accelerated = simulatePayoff({
    balance: acceleratedBalance,
    annualRatePercent: input.annualRatePercent,
    monthlyPayment: acceleratedPayment,
  })

  if (!original || !accelerated) return null

  return {
    original,
    accelerated,
    monthsSaved: original.months - accelerated.months,
    interestSaved: original.totalInterest - accelerated.totalInterest,
    originalPayoffDate: payoffDateFromMonths(original.months),
    acceleratedPayoffDate: payoffDateFromMonths(accelerated.months),
  }
}

export interface EquitySnapshot {
  equity: number
  ltv: number
}

export function computeEquity(marketValue: number, currentBalance: number): EquitySnapshot | null {
  if (marketValue <= 0) return null
  return {
    equity: marketValue - currentBalance,
    ltv: currentBalance / marketValue,
  }
}

export interface PortfolioMortgageEntry {
  propertyId: string
  propertyName: string
  marketValue: number | null
  currentBalance: number
}

export interface PortfolioTotals {
  totalBalance: number
  totalMarketValue: number
  totalEquity: number
  overallLtv: number | null
  missingMarketValueCount: number
}

/**
 * totalBalance covers every mortgaged property, since a balance doesn't need
 * a market value to be real. Equity and LTV, by contrast, are only computed
 * over the subset that has both figures — mixing a valued property's equity
 * with an unvalued property's un-countable "equity" would misstate the
 * portfolio number rather than just leave a gap in it.
 */
export function computePortfolioTotals(entries: PortfolioMortgageEntry[]): PortfolioTotals {
  let totalBalance = 0
  let valuedBalance = 0
  let totalMarketValue = 0
  let missingMarketValueCount = 0

  for (const entry of entries) {
    totalBalance += entry.currentBalance
    if (entry.marketValue !== null) {
      valuedBalance += entry.currentBalance
      totalMarketValue += entry.marketValue
    } else {
      missingMarketValueCount += 1
    }
  }

  return {
    totalBalance,
    totalMarketValue,
    totalEquity: totalMarketValue - valuedBalance,
    overallLtv: totalMarketValue > 0 ? valuedBalance / totalMarketValue : null,
    missingMarketValueCount,
  }
}
