import { actionErrorMessage } from './invoiceBlockers'
import type { RentInvoiceRow } from './rentInvoiceTypes'

// How Rent ops runs a workflow action and refreshes what's on screen
// (no Supabase, no React — the hook supplies both).

export type RpcError = { code?: string; message: string } | null
type Rpc<T> = () => PromiseLike<{ data: T; error: RpcError }>

export interface ActionHost {
  setBusy: (busy: boolean) => void
  setError: (message: string | null) => void
  setNotice: (message: string | null) => void
  // Reloads the review list; with an id, also re-reads that invoice into
  // the open details panel.
  refresh: (keepId: string | null) => Promise<void>
  onRecordsChanged: () => void
}

export type ActionRunner = <T>(action: Rpc<T>, keepId: string | null, success: string | null) => Promise<T | null>

export function actionRunner(host: ActionHost): ActionRunner {
  return async (action, keepId, success) => {
    host.setBusy(true)
    host.setError(null)
    host.setNotice(null)
    const { data, error } = await action()
    host.setBusy(false)
    if (error) {
      host.setError(actionErrorMessage(error))
      if (error.code === 'ZM324') await host.refresh(keepId) // show the newer version
      return null
    }
    if (success) host.setNotice(success)
    await host.refresh(keepId)
    host.onRecordsChanged()
    return data
  }
}

interface ClosingQueries {
  rejectInvoice: (id: string, expectedVersion: number, reason: string | null) => PromiseLike<{ data: unknown; error: RpcError }>
  cancelInvoice: (id: string, expectedVersion: number, reason: string) => PromiseLike<{ data: unknown; error: RpcError }>
}

// Reject and cancel both re-read the invoice they acted on, so the open
// details panel shows the saved result — a rejected draft closes, a
// cancelled invoice turns read-only with no Revise/Cancel — instead of the
// status and actions it had before.
export function closingActions(run: ActionRunner, q: ClosingQueries) {
  return {
    reject: (inv: RentInvoiceRow, reason: string | null) =>
      run(() => q.rejectInvoice(inv.id, inv.version, reason), inv.id, 'Draft rejected.'),
    cancel: (invoiceId: string, version: number, reason: string) =>
      run(() => q.cancelInvoice(invoiceId, version, reason), invoiceId, 'Invoice cancelled. Its number is kept and never reused.'),
  }
}
