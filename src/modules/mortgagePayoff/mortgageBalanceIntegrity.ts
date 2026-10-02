// Mortgage balance integrity (migration 20261004100000) — pure helpers for the Mortgage tab: how a save is split
// between ordinary loan details and a versioned balance reset, and what each void outcome means for the user.
import type { MortgageDetails, MortgageDetailsInput } from './mortgagePayoffQueries'
import { mortgageCurrencyFormatter } from './mortgagePayoffFormat'

export type VoidOutcome =
  | 'reversed'
  | 'skipped_reset_after_entry'
  | 'skipped_loan_inactive'
  | 'skipped_unlinked_legacy'
  | 'refused_negative_escrow'
  | 'refused_over_original'
  | 'already_voided'

export interface BalanceReset {
  principal: number | null
  escrow: number | null
  statementDate: string | null
}

export interface MortgageSavePlan {
  details: Omit<MortgageDetailsInput, 'current_balance' | 'escrow_balance' | 'balance_statement_date'>
  reset: BalanceReset | null
  error: string | null
}

const amount = (value: string | number | null | undefined): number | null =>
  value === null || value === undefined || String(value).trim() === '' ? null : Number(value)

// Ordinary edits never send the balances (the database refuses balance changes outside the reset function).
// A balance the user changed is reset through the versioned function; an unchanged balance is not touched.
export function planMortgageSave(loaded: MortgageDetails, input: MortgageDetailsInput): MortgageSavePlan {
  const details = {
    lender_name: input.lender_name,
    original_loan_amount: input.original_loan_amount,
    interest_rate: input.interest_rate,
    monthly_payment: input.monthly_payment,
    loan_start_date: input.loan_start_date,
    term_years: input.term_years,
    loan_number: input.loan_number,
    loan_type: input.loan_type,
  }
  const principalNow = amount(loaded.current_balance)
  const principalNew = amount(input.current_balance)
  const escrowNow = amount(loaded.escrow_balance)
  const escrowNew = amount(input.escrow_balance)

  if (escrowNow !== null && escrowNew === null) {
    return { details, reset: null, error: 'To show that there is no escrow money, enter 0.00 rather than leaving escrow blank.' }
  }
  const principal = principalNew !== null && principalNew !== principalNow ? principalNew : null
  const escrow = escrowNew !== null && escrowNew !== escrowNow ? escrowNew : null
  const statementDate = input.balance_statement_date || null
  return {
    details,
    reset: principal === null && escrow === null ? null : { principal, escrow, statementDate },
    error: null,
  }
}

export const REVIEW_NOTE = 'A balance review was added to the Action Queue.'

// Shown on a voided row whose void did not change the balance.
export function voidedRowNote(outcome: string | null): string | null {
  switch (outcome) {
    case 'skipped_reset_after_entry':
      return 'Balance not adjusted: it was reset after this entry. Check it against your statement.'
    case 'skipped_loan_inactive':
      return 'Balance not adjusted: this entry belongs to an inactive mortgage record, kept as it was.'
    case 'skipped_unlinked_legacy':
      return 'Balance not adjusted: this earlier entry is not linked to a loan.'
    default:
      return null
  }
}

// Postgres aborts one side of a rare simultaneous change (deadlock 40P01, serialization failure 40001); nothing was
// saved by the aborted statement.
export function isSimultaneousChange(error: { code?: string | null }): boolean {
  return error.code === '40P01' || error.code === '40001'
}

export function friendlyDatabaseError(error: { code?: string | null; message: string }): string {
  if (isSimultaneousChange(error)) {
    return 'Changed at the same time somewhere else, so nothing was saved. Try again.'
  }
  return error.message
}

// Message for a void that was refused (the entry stays active), or null when the void went through.
export function voidRefusalMessage(outcome: string | null): string | null {
  switch (outcome) {
    case 'refused_negative_escrow':
      return `Not voided: a later disbursement used this deposit, so voiding it would make escrow negative. Void that disbursement first, or update escrow from a statement. ${REVIEW_NOTE}`
    case 'refused_over_original':
      return `Not voided: this would raise the balance above the original loan amount. Check the balance against your statement. ${REVIEW_NOTE}`
    default:
      return null
  }
}

// Stale-balance conflict (ZM5M5). The server's text says "Reload…", which is wrong for this app: the Mortgage form keeps
// the user's entries (reloading would discard them) and the Action Queue refreshes itself. So the server text is never
// shown; these messages say what happened and how to compare.
const money = (value: string | number | null | undefined) =>
  value === null || value === undefined || String(value).trim() === '' ? 'none' : mortgageCurrencyFormatter.format(Number(value))

export function staleBalanceFormMessage(
  stored: Pick<MortgageDetails, 'current_balance' | 'escrow_balance'> | null,
  entered: Pick<MortgageDetailsInput, 'current_balance' | 'escrow_balance'>,
): string {
  const what = 'The balance changed while you were editing, so nothing was saved. Your entries are still here; no need to reload.'
  if (!stored) {
    return `${what}\nThe current figures couldn't be loaded just now: copy your entries, then Cancel and reopen Edit to see them.`
  }
  // One fact or choice per line (the form shows each line separately): figures first, then the three choices.
  return [
    what,
    `Stored now: principal ${money(stored.current_balance)} · escrow ${money(stored.escrow_balance)}`,
    `In this form: principal ${money(entered.current_balance)} · escrow ${money(entered.escrow_balance)}`,
    'Check your statement, then choose one:',
    '• Save again to use the figures in this form.',
    '• To keep the stored figures, type them into the balance fields, then save.',
    '• Cancel discards all your changes.',
  ].join('\n')
}

export const STALE_BALANCE_REVIEW_MESSAGE =
  'The balance changed after this review was shown, so nothing was confirmed. The figures below have been refreshed; check them against your statement and confirm again.'

// Errors from the Action Queue's balance confirmation.
export function reviewActionError(error: { code?: string | null; message: string }): string {
  return error.code === 'ZM5M5' ? STALE_BALANCE_REVIEW_MESSAGE : friendlyDatabaseError(error)
}
