import type { BalanceResetRequest, MortgageDetails, MortgageDetailsInput } from './mortgagePayoffQueries'
import { friendlyDatabaseError, isSimultaneousChange, planMortgageSave, staleBalanceFormMessage } from './mortgageBalanceIntegrity'

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

// The balance update committed but the details update did not (a simultaneous change, 40P01/40001, or a refusal).
export function partialSaveMessage(error: DbError): string {
  const reason = isSimultaneousChange(error)
    ? 'they were changed at the same time somewhere else'
    : error.message.trim().replace(/\.$/, '')
  return `The balance was saved. Only the other loan details were not saved, because ${reason}. Your entries are still in the form; save again to apply them.`
}

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
        // The balance changed since the form opened: adopt the stored record (so the next Save is checked against it)
        // and show the stored figures beside the ones still in the form. Never the server's "Reload…" text (B-1 keeps
        // the entries; reloading would discard them).
        const { data: latest } = await deps.fetchLatest()
        return latest
          ? { ok: false, details: latest, error: staleBalanceFormMessage(latest, input) }
          : { ok: false, error: staleBalanceFormMessage(null, input) }
      }
      return { ok: false, error: `${friendlyDatabaseError(resetError)} ${NOT_SAVED}` }
    }
  }

  const { data, error: saveError } = await deps.update(current.id, plan.details)
  if (saveError || !data) {
    const failure = saveError ?? { message: 'The loan details could not be saved.' }
    if (!plan.reset) return { ok: false, error: `${friendlyDatabaseError(failure)} ${NOT_SAVED}` }
    // The balance update committed; only the other details failed. Say exactly that (never "nothing was saved"), and
    // reload the loan so the retry is checked against the stored balance and its new version: the form's balance then
    // matches it, so the retry sends only the details, with no second balance update.
    const { data: latest } = await deps.fetchLatest()
    return { ok: false, ...(latest ? { details: latest } : {}), error: partialSaveMessage(failure) }
  }

  return { ok: true, error: null, details: data }
}
