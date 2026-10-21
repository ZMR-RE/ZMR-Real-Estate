import { currencyAmountError, formatCurrencyAmount } from '../../shared/currencyAmount'
import type { Allocation, BalanceReference, DraftReview, ExistingPayment, LoanScope, Match, SourceActivity, StatementBalance } from './reconciliationTypes'

export function cents(value: string, signed = false): bigint {
  const error = currencyAmountError(value, { required: true, min: signed ? '-99999999.99' : '0', max: '99999999.99' })
  if (error) throw new Error(error)
  return BigInt(formatCurrencyAmount(value).replace('.', ''))
}
export function dollars(value: bigint): string {
  const abs = value < 0n ? -value : value
  return `${value < 0n ? '-' : ''}${abs / 100n}.${String(abs % 100n).padStart(2, '0')}`
}
export function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}
export function assertScope(scope: LoanScope, row: LoanScope) {
  if (['accountId', 'propertyId', 'mortgageId'].some(k => scope[k as keyof LoanScope] !== row[k as keyof LoanScope])) throw new Error('This record belongs to a different account, property or loan.')
}
export function allocationCheck(input: Allocation): { valid: boolean; message: string } {
  try {
    const total = cents(input.total)
    if (total <= 0n) throw new Error('Enter a positive total payment.')
    const difference = total - cents(input.principal) - cents(input.interest) - cents(input.escrow) - cents(input.fees ?? '0')
    return { valid: difference === 0n, message: difference === 0n ? `Balanced · $${dollars(total)} allocated` : difference > 0n ? `$${dollars(difference)} still needs allocation` : `Allocations exceed total by $${dollars(-difference)}` }
  } catch (error) { return { valid: false, message: (error as Error).message } }
}
export function validateSource(scope: LoanScope, row: SourceActivity) {
  assertScope(scope, row)
  if (!row.documentId || !/^[a-f0-9]{64}$/.test(row.digest) || !Number.isInteger(row.line) || row.line < 1 || row.sourceId !== `${row.digest}:${row.line}`) throw new Error('Verified document and source-line identity are required.')
  if (!validDate(row.statementDate) || !validDate(row.postedDate) || row.postedDate > row.statementDate) throw new Error('Review the posted and statement dates.')
  if (row.kind === 'payment' || row.kind === 'principal') {
    const check = allocationCheck(row)
    if (!check.valid) throw new Error(check.message)
    if (row.kind === 'principal' && (cents(row.interest) !== 0n || cents(row.escrow) !== 0n || cents(row.fees ?? '0') !== 0n)) throw new Error('Principal-only activity cannot include interest or escrow.')
  } else if (row.kind === 'reversal') {
    if (cents(row.fees ?? '0') !== 0n) throw new Error('Review adjustment fees separately.')
    if (cents(row.total) !== 0n || cents(row.principal, true) >= 0n || cents(row.interest) !== 0n || cents(row.escrow) !== 0n) throw new Error('This reversal needs a separately reviewed allocation.')
  } else if (row.kind === 'escrow_disbursement') {
    if (cents(row.fees ?? '0') !== 0n) throw new Error('Review adjustment fees separately.')
    const total = cents(row.total, true)
    if (total === 0n || cents(row.escrow, true) !== -(total < 0n ? -total : total) || cents(row.principal) !== 0n || cents(row.interest) !== 0n) throw new Error('Review the escrow disbursement allocation.')
  } else throw new Error('Unsupported statement activity.')
}
export function matchPayment(scope: LoanScope, source: SourceActivity, existing: ExistingPayment[]): Match {
  validateSource(scope, source)
  existing.forEach(row => assertScope(scope, {...row, mortgageId:row.mortgageId ?? scope.mortgageId}))
  if (source.kind === 'reversal' || source.kind === 'escrow_disbursement') return { status: 'missing', message: 'Adjustment to review; not a new cash payment.' }
  const candidates = existing.filter(row => !row.voided && row.postedDate === source.postedDate && cents(row.total) === cents(source.total))
  if (!candidates.length) return { status: 'missing', message: 'Not recorded' }
  if (candidates.some(row => row.mortgageId === null)) return {status:'conflict',message:'An earlier unlinked payment may match. Compare it without assigning it to this loan automatically.'}
  const exact = candidates.filter(row => (['principal', 'interest', 'escrow', 'fees'] as const).every(k => cents(row[k] ?? '0') === cents(source[k] ?? '0')))
  if (candidates.length !== 1 || exact.length !== 1) return { status: 'conflict', message: 'A same-date, same-total entry exists. Review its allocation before adding anything.' }
  return { status: 'matched', existingId: exact[0].id, message: 'Already recorded; preserve this entry and review its balance treatment.' }
}
export function reviewDraft(scope: LoanScope, source: SourceActivity, existing: ExistingPayment[], reference: BalanceReference | null, sourceConfirmed: boolean, drafts: DraftReview[]): DraftReview {
  validateSource(scope, source)
  if (!sourceConfirmed) throw new Error('Compare the allocation with its source statement first.')
  if (!reference || !validDate(reference.date) || !Number.isInteger(reference.revision) || reference.revision < 1) throw new Error('A confirmed, dated balance reference is required before preparing history.')
  cents(reference.principal); cents(reference.escrow, true)
  if (source.postedDate > reference.date) throw new Error('This activity is after the reference date. Review it as new activity separately.')
  const match = matchPayment(scope, source, existing)
  if (match.status === 'conflict') throw new Error(match.message)
  if (drafts.some(row => row.sourceId === source.sourceId)) throw new Error('This source line is already in the draft.')
  const collision = drafts.some(row => row.source.postedDate === source.postedDate && row.source.kind === source.kind && cents(row.source.total, true) === cents(source.total, true))
  if (collision) throw new Error('Similar activity is already in the draft. Review both source lines before including another.')
  return { sourceId: source.sourceId, documentId: source.documentId, digest: source.digest, line: source.line, source: { ...source }, action: match.status === 'matched' ? 'retain_existing' : source.kind === 'payment' || source.kind === 'principal' ? 'historical_payment' : 'historical_adjustment', existingId: match.existingId, referenceRevision: reference.revision, currentPrincipalEffect: '0.00', currentEscrowEffect: '0.00' }
}
export function statementBridge(scope: LoanScope, previous: StatementBalance, next: StatementBalance, rows: SourceActivity[]) {
  assertScope(scope, previous); assertScope(scope, next)
  if (!validDate(previous.date) || !validDate(next.date) || next.date <= previous.date) throw new Error('Statements must be in date order.')
  const identities = new Set<string>()
  for (const row of rows) {
    validateSource(scope, row)
    if (row.documentId !== next.documentId || row.statementDate !== next.date || row.postedDate <= previous.date || identities.has(row.sourceId)) throw new Error('Review duplicated, overlapping or incorrectly linked source activity.')
    identities.add(row.sourceId)
  }
  const principalDifference = cents(next.principal) - (cents(previous.principal) - rows.reduce((n, row) => n + cents(row.principal, true), 0n))
  const escrowDifference = cents(next.escrow, true) - (cents(previous.escrow, true) + rows.reduce((n, row) => n + cents(row.escrow, true), 0n))
  const previousMonth = Number(previous.date.slice(0, 4)) * 12 + Number(previous.date.slice(5, 7))
  const nextMonth = Number(next.date.slice(0, 4)) * 12 + Number(next.date.slice(5, 7))
  return { principalDifference: dollars(principalDifference), escrowDifference: dollars(escrowDifference), balancesMatch: principalDifference === 0n && escrowDifference === 0n, missingMonths: Math.max(0, nextMonth - previousMonth - 1) }
}
