import type { AmortizationInput } from '../mortgagePayoff/mortgagePayoffMath'
export const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
export function readableDate(value?: string | null) {
  if (!value) return 'Date not recorded'
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`)
  return Number.isNaN(date.getTime()) ? 'Date not recorded' : date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}
export interface RecordedPoint { id: string; at: string; balance: number; cause: string }
export interface BalanceRecord { id: string; new_value: string | null; changed_at: string }
// Audit rows have no direct effect-row identifier. Never infer a payment cause
// from a timestamp match: corrections and payments can share a transaction.
export function recordedPoints(rows: BalanceRecord[]): RecordedPoint[] {
  return rows.filter(r => Number.isFinite(Date.parse(r.changed_at)) && r.new_value !== null && r.new_value.trim() !== '' && Number.isFinite(Number(r.new_value)))
    .map(r => ({id:r.id, at:r.changed_at, balance:Number(r.new_value), cause:'Recorded balance change · cause not linked'}))
    .sort((a,b) => a.at.localeCompare(b.at))
}
// Same monthly convention as simulatePayoff. This is projection data only.
export function projectedBalances({balance, annualRatePercent, monthlyPayment}: AmortizationInput): number[] {
  if (![balance, annualRatePercent, monthlyPayment].every(Number.isFinite) || balance < 0 || annualRatePercent < 0 || monthlyPayment <= 0) return []
  const points = [balance]
  for (let m = 0; balance > 0 && m < 1200; m++) {
    const principal = monthlyPayment - balance * annualRatePercent / 1200
    if (principal <= 0) return []
    balance = Math.max(0, balance - principal)
    points.push(balance)
  }
  return balance > 0 ? [] : points
}
