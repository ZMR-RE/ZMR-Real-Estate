// Mortgage balance integrity (migration 20261004100000) — pure helpers for the Mortgage tab: how a save is split
// between ordinary loan details and a versioned balance reset, and what each void outcome means for the user.
import type { MortgageDetails, MortgageDetailsInput } from './mortgagePayoffQueries'

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
}

export interface MortgageSavePlan {
  details: Omit<MortgageDetailsInput, 'current_balance' | 'escrow_balance'>
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
  return { details, reset: principal === null && escrow === null ? null : { principal, escrow }, error: null }
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
