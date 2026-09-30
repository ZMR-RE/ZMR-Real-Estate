import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { actionErrorMessage, describeBlockers, type BlockerInfo } from './invoiceBlockers'
import { buildInvoiceDocument } from './invoiceDocument'
import { invoicePdfBlob } from './invoicePdf'
import {
  approveInvoice,
  attachIssuedInvoicePdf,
  cancelInvoice,
  createInvoiceDraft,
  getDraftBlockers,
  getInvoice,
  issueInvoice,
  listInvoicesAwaitingDecision,
  listIssuers,
  listTenancyOptions,
  rejectInvoice,
  reviseInvoice,
  updateInvoiceDraft,
  type InvoicePatch,
  type IssuerRow,
  type TenancyOptionRow,
} from './rentInvoicesQueries'
import type { RentInvoiceRow } from './rentInvoiceTypes'

type RpcError = { code?: string; message: string } | null

// Business logic for Rent ops' manual invoice workflow: draft from a tenancy
// → review/edit → approve → issue (number + stored PDF) → revise or cancel.
// Every write is a database action carrying the version the owner saw, so a
// change made elsewhere (another tab, the assistant) is caught, not
// overwritten. `onRecordsChanged` refreshes Rent ops' own list, which reads
// the same invoice rows.
export function useInvoiceWorkflow(onRecordsChanged: () => void) {
  const { accountId } = useAuth()
  const [awaiting, setAwaiting] = useState<RentInvoiceRow[]>([])
  const [tenancies, setTenancies] = useState<TenancyOptionRow[]>([])
  const [issuers, setIssuers] = useState<IssuerRow[]>([])
  const [selected, setSelected] = useState<RentInvoiceRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const refresh = useCallback(async (keepId?: string | null) => {
    if (!accountId) return
    const { data, error: e } = await listInvoicesAwaitingDecision(accountId)
    if (e) return setError(e.message)
    setAwaiting(data ?? [])
    if (keepId) {
      const fresh = await getInvoice(keepId)
      setSelected(fresh.data ?? null)
    }
  }, [accountId])

  // Cross-module freshness: tenancies and issuers are owned by other
  // modules, so they reload whenever the picker/edit form opens.
  const refreshOptions = useCallback(async () => {
    if (!accountId) return
    const [t, i] = await Promise.all([listTenancyOptions(accountId), listIssuers(accountId)])
    setTenancies(t.data ?? [])
    setIssuers(i.data ?? [])
  }, [accountId])

  useEffect(() => {
    refresh()
    refreshOptions()
  }, [refresh, refreshOptions])

  const run = async <T,>(action: () => PromiseLike<{ data: T; error: RpcError }>, keepId: string | null, success: string | null) => {
    setBusy(true)
    setError(null)
    setNotice(null)
    const { data, error: e } = await action()
    setBusy(false)
    if (e) {
      setError(actionErrorMessage(e))
      if (e.code === 'ZM324') await refresh(keepId) // show the newer version
      return null
    }
    if (success) setNotice(success)
    await refresh(keepId)
    onRecordsChanged()
    return data
  }

  const checkBlockers = async (leaseId: string, periodStart: string): Promise<{ codes: string[]; info: BlockerInfo[] }> => {
    const { data } = await getDraftBlockers(leaseId, periodStart)
    const codes = (data as string[] | null) ?? []
    return { codes, info: describeBlockers(codes) }
  }

  const createDraft = async (leaseId: string, periodStart: string, manualAmount: number | null) => {
    const id = await run(() => createInvoiceDraft(leaseId, periodStart, manualAmount) as PromiseLike<{ data: string; error: RpcError }>, null, 'Draft saved. Review it, then approve.')
    if (id) {
      setCreating(false)
      await refresh(id)
    }
  }

  const saveEdit = (inv: RentInvoiceRow, patch: InvoicePatch) =>
    run(() => updateInvoiceDraft(inv.id, inv.version, patch), inv.id, 'Saved.')

  const approve = (inv: RentInvoiceRow) => run(() => approveInvoice(inv.id, inv.version), inv.id, 'Approved. Issue it when you’re ready — issuing assigns the number.')
  const reject = (inv: RentInvoiceRow, reason: string | null) => run(() => rejectInvoice(inv.id, inv.version, reason), null, 'Draft rejected.')

  // Issue, then render the PDF from the stored snapshot and keep it once.
  // Store the PDF BEFORE showing the issued invoice, so its panel opens on
  // the stored file rather than racing it.
  const issue = async (inv: RentInvoiceRow) => {
    const number = await run(() => issueInvoice(inv.id, inv.version) as PromiseLike<{ data: string; error: RpcError }>, null, null)
    if (!number) return
    const fresh = (await getInvoice(inv.id)).data
    if (fresh) await storePdf(fresh)
    await refresh(inv.id)
    setNotice(`Issued as ${number}. Nothing was sent; deliver it yourself.`)
  }

  const [pdfNonce, setPdfNonce] = useState(0)
  const storePdf = async (inv: RentInvoiceRow) => {
    const model = buildInvoiceDocument(inv, null)
    const result = await attachIssuedInvoicePdf(inv, model.filename, await invoicePdfBlob(model))
    if (result.error) setError(`Issued, but the PDF wasn’t stored yet: ${result.error.message}. Use “Store PDF” to retry.`)
    setPdfNonce((n) => n + 1)
    onRecordsChanged()
  }

  const revise = async (invoiceId: string, version: number) => {
    const id = await run(() => reviseInvoice(invoiceId, version) as PromiseLike<{ data: string; error: RpcError }>, null, 'Revision draft created. The issued invoice and its PDF stay unchanged until the revision is issued.')
    if (id) await refresh(id)
  }

  const cancel = (invoiceId: string, version: number, reason: string) =>
    run(() => cancelInvoice(invoiceId, version, reason), null, 'Invoice cancelled. Its number is kept and never reused.')

  // Open any invoice by id (e.g. a numbered one from Rent ops' issued list).
  const openInvoice = async (id: string) => {
    const { data, error: e } = await getInvoice(id)
    if (e) return setError(e.message)
    setSelected(data)
    setNotice(null)
    setError(null)
  }

  return {
    awaiting,
    openInvoice,
    tenancies,
    issuers,
    selected,
    select: (inv: RentInvoiceRow | null) => {
      setSelected(inv)
      setNotice(null)
      setError(null)
    },
    creating,
    startCreating: () => {
      refreshOptions()
      setCreating(true)
    },
    stopCreating: () => setCreating(false),
    refreshOptions,
    busy,
    error,
    notice,
    checkBlockers,
    createDraft,
    saveEdit,
    approve,
    reject,
    issue,
    storePdf,
    pdfNonce,
    revise,
    cancel,
  }
}

export type InvoiceWorkflow = ReturnType<typeof useInvoiceWorkflow>
