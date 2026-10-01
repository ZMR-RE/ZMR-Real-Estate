import type { ChargeRuleInput, ChargeRuleKind, ChargeRuleRow } from './chargeRulesQueries'

// Pure helpers for tenancy billing rules (no Supabase, no React). Mirrors
// the database's charge_rule_shape check so the form refuses what the
// database would.

const MONEY = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const MONTH = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
export const monthLabel = (iso: string) => MONTH.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`))
export const money = (n: number) => MONEY.format(n)

export const KIND_LABEL: Record<ChargeRuleKind, string> = {
  fixed_recurring: 'Recurring charge',
  variable_statement: 'Share of a variable bill',
  one_time: 'One-time charge or credit',
}

export interface RuleFormValues {
  kind: ChargeRuleKind
  description: string
  amount: string
  basisTotal: string
  sharePercent: string
  effectiveFrom: string
  effectiveTo: string
  oneTimeMonth: string
  notes: string
}

export function ruleFormFrom(r: ChargeRuleRow | null, kind: ChargeRuleKind = 'fixed_recurring'): RuleFormValues {
  return {
    kind: r?.kind ?? kind,
    description: r?.description ?? '',
    amount: r?.amount != null ? Number(r.amount).toFixed(2) : '',
    basisTotal: r?.basis_total != null ? Number(r.basis_total).toFixed(2) : '',
    sharePercent: r?.share_percent != null ? String(Number(r.share_percent)) : '',
    effectiveFrom: r?.effective_from ?? '',
    effectiveTo: r?.effective_to ?? '',
    oneTimeMonth: r?.one_time_period?.slice(0, 7) ?? '',
    notes: r?.notes ?? '',
  }
}

const num = (s: string) => (s.trim() === '' ? null : Number(s))

export function validateRule(v: RuleFormValues): string[] {
  const errors: string[] = []
  if (!v.description.trim()) errors.push('Describe the charge (it prints on the invoice).')
  const amount = num(v.amount)
  const share = num(v.sharePercent)
  const basis = num(v.basisTotal)
  if (v.kind === 'fixed_recurring' && !(amount != null && Number.isFinite(amount) && amount > 0)) errors.push('Enter the amount charged each month.')
  if (v.kind === 'one_time' && !(amount != null && Number.isFinite(amount) && amount !== 0)) errors.push('Enter the amount (negative for a credit).')
  if (v.kind === 'one_time' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(v.oneTimeMonth)) errors.push('Choose the month it’s billed in.')
  if (v.kind === 'variable_statement' && !(share != null && share > 0 && share <= 100)) errors.push('Enter the tenant’s share, 1–100%.')
  if (v.kind === 'fixed_recurring' && (basis != null) !== (share != null)) errors.push('For “half of a cost”, enter both the full cost and the share — or neither.')
  if (basis != null && !(basis > 0)) errors.push('The full cost must be more than zero.')
  if (v.effectiveFrom && v.effectiveTo && v.effectiveTo < v.effectiveFrom) errors.push('The rule can’t end before it starts.')
  return errors
}

// Only the fields that kind uses are sent; the rest are null (as the
// database's shape check requires). Nothing is derived or estimated.
export function ruleInputFrom(v: RuleFormValues): ChargeRuleInput {
  const recurring = v.kind !== 'one_time'
  return {
    kind: v.kind,
    description: v.description.trim(),
    amount: v.kind === 'variable_statement' ? null : num(v.amount),
    basis_total: v.kind === 'fixed_recurring' ? num(v.basisTotal) : null,
    share_percent: v.kind === 'one_time' ? null : num(v.sharePercent),
    effective_from: recurring ? v.effectiveFrom || null : null,
    effective_to: recurring ? v.effectiveTo || null : null,
    one_time_period: v.kind === 'one_time' ? `${v.oneTimeMonth}-01` : null,
    notes: v.notes.trim() || null,
  }
}

// One-line summary shown in the box's view state.
export function ruleSummary(r: ChargeRuleRow): string {
  if (r.kind === 'fixed_recurring') {
    const basis = r.basis_total != null && r.share_percent != null ? ` (${Number(r.share_percent)}% of ${money(Number(r.basis_total))})` : ''
    return `${money(Number(r.amount))} monthly${basis}`
  }
  if (r.kind === 'variable_statement') return `${Number(r.share_percent)}% of each statement entered`
  return `${money(Number(r.amount))} in ${monthLabel(r.one_time_period!)}${Number(r.amount) < 0 ? ' (credit)' : ''}`
}

export function ruleDates(r: ChargeRuleRow): string | null {
  if (r.kind === 'one_time') return null
  if (r.effective_from && r.effective_to) return `${r.effective_from} to ${r.effective_to}`
  if (r.effective_from) return `from ${r.effective_from}`
  if (r.effective_to) return `until ${r.effective_to}`
  return null
}

// A billed one-time charge, or a billed statement, is fixed until that
// invoice is rejected or cancelled (the database refuses edits).
export const ruleLocked = (r: ChargeRuleRow) => r.kind === 'one_time' && r.applied_invoice_id != null

export function nextPeriod(today: Date): string {
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)).toISOString().slice(0, 10)
}
