import type { BalanceResetRequest, MortgageDetails, MortgageDetailsInput } from './mortgagePayoffQueries'
import { friendlyDatabaseError, planMortgageSave } from './mortgageBalanceIntegrity'

// The save flow behind "Save mortgage details", kept free of React and Supabase so every refusal path is testable.
// The query functions are passed in by useMortgageDetails.
//
// A refusal never closes the form: `ok: false` always means "stay in edit mode with the user's entries and show
// `error` inside the form". `details`, when present, replaces the hook's loan record (the latest figures after a
// conflict or a partly applied save), so a second attempt is checked against what is really stored.

type DbError = { code?: string | null; message: string }
type QueryResult<T> = Promise<{ data: T | null; error: DbError | null }>

export interface MortgageDetailsSaveDeps {
  create: (input: MortgageDetailsInput) => QueryResult<MortgageDetails>
  reset: (req: BalanceResetRequest) => QueryResult<unknown>
  update: (id: string, details: Omit<MortgageDetailsInput, 'current_balance' | 'escrow_balance'>) => QueryResult<MortgageDetails>
  fetchLatest: () => QueryResult<MortgageDetails>
}

export interface MortgageDetailsSaveResult {
  ok: boolean
  error: string | null
  details?: MortgageDetails
}

const NOT_SAVED = 'Nothing was saved; your entries are still in the form.'

export async function saveMortgageDetails(
  deps: MortgageDetailsSaveDeps,
  current: MortgageDetails | null,
  input: MortgageDetailsInput,
): Promise<MortgageDetailsSaveResult> {
  if (!current) {
    const { data, error } = await deps.create(input)
    if (error || !data) return { ok: false, error: `${friendlyDatabaseError(error ?? { message: 'The loan could not be saved.' })} ${NOT_SAVED}` }
    return { ok: true, error: null, details: data }
  }

  const plan = planMortgageSave(current, input)
  if (plan.error) return { ok: false, error: plan.error }

  if (plan.reset) {
    const { error: resetError } = await deps.reset({
      mortgageId: current.id,
      principal: plan.reset.principal,
      principalVersion: plan.reset.principal === null ? null : current.principal_version,
      escrow: plan.reset.escrow,
      escrowVersion: plan.reset.escrow === null ? null : current.escrow_version,
      statementDate: plan.reset.statementDate,
    })
    if (resetError) {
      if (resetError.code === 'ZM5M5') {
        // The balance changed since the form opened: show the stored figures so the user can compare and save again.
        const { data: latest } = await deps.fetchLatest()
        return latest
          ? {
              ok: false,
              details: latest,
              error: `${resetError.message} Current balance: ${latest.current_balance}; escrow: ${latest.escrow_balance ?? 'none'}.`,
            }
          : { ok: false, error: resetError.message }
      }
      return { ok: false, error: `${friendlyDatabaseError(resetError)} ${NOT_SAVED}` }
    }
  }

  const { data, error: saveError } = await deps.update(current.id, plan.details)
  if (saveError || !data) {
    const message = friendlyDatabaseError(saveError ?? { message: 'The loan details could not be saved.' })
    if (!plan.reset) return { ok: false, error: `${message} ${NOT_SAVED}` }
    // The balance update committed but the other details did not: reload the loan so the next attempt is checked
    // against the stored balance and its new version, not the one the form opened with.
    const { data: latest } = await deps.fetchLatest()
    return {
      ok: false,
      ...(latest ? { details: latest } : {}),
      error: `The balance was saved, but the other loan details were not: ${message} Your entries are still in the form.`,
    }
  }

  return { ok: true, error: null, details: data }
}
