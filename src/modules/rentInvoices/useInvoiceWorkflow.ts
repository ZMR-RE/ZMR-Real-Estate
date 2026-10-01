import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { actionRunner, closingActions, type RpcError } from './invoiceActions'
import { describeBlockers, type BlockerInfo } from './invoiceBlockers'
import { buildInvoiceRender, changedSinceApproval, type InvoiceRender } from './invoiceDocument'
import { invoicePdfBlob } from './invoicePdf'
import {
  approveInvoice,
  attachIssuedInvoicePdf,
  cancelInvoice,
  createInvoiceDraft,
  getDraftBlockers,
  getInvoice,
  getPrintSnapshot,
  loadSnapshotLogo,
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
import type { PrintSnapshot, RentInvoiceRow } from './rentInvoiceTypes'

// What the selected invoice prints. For a draft/approved invoice: the
// CURRENT print snapshot (and, once approved, what changed since). For an
// issued one: its stored issued snapshot.
export interface SelectedDocument {
  invoiceId: string
  version: number
  snapshot: PrintSnapshot | null
  render: InvoiceRender | null
  changedSinceApproval: string[]
  problem: string | null
}

// Renders a snapshot, loading the exact logo version it names.
async function renderSnapshot(s: PrintSnapshot, issued: { number: string; issuedAt: string } | null): Promise<InvoiceRender> {
  let logo = null
  if (s.branding.logo) {
    const r = await loadSnapshotLogo(s.branding.logo)
    if (r.error) throw r.error
    logo = r.data
  }
  return buildInvoiceRender(s, issued, logo)
}

async function documentFor(inv: RentInvoiceRow): Promise<SelectedDocument> {
  const base = { invoiceId: inv.id, version: inv.version, changedSinceApproval: [] as string[] }
  try {
    if (inv.issued_snapshot) {
      const s = inv.issued_snapshot
      return { ...base, snapshot: s, render: await renderSnapshot(s, { number: s.number, issuedAt: s.issued_at }), problem: null }
    }
    const { data: s, error } = await getPrintSnapshot(inv.id)
    if (error || !s) return { ...base, snapshot: null, render: null, problem: error?.message ?? 'This invoice couldn’t be read.' }
    const changed = inv.state === 'approved' && inv.approved_snapshot ? changedSinceApproval(inv.approved_snapshot, s) : []
    if (!s.issuer) return { ...base, snapshot: s, render: null, changedSinceApproval: changed, problem: 'Choose the invoice issuer (Edit) to preview the PDF.' }
    return { ...base, snapshot: s, render: await renderSnapshot(s, null), changedSinceApproval: changed, problem: null }
  } catch (e) {
    return { ...base, snapshot: null, render: null, problem: e instanceof Error ? e.message : String(e) }
  }
}

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
  const [selectedDoc, setSelectedDoc] = useState<SelectedDocument | null>(null)
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

  // Reload what the selected invoice prints whenever it (or its version)
  // changes. Settings edited elsewhere show up on re-selection or after any
  // action, and issue re-checks them in the database regardless.
  const selectedKey = selected ? `${selected.id}:${selected.version}` : null
  useEffect(() => {
    let alive = true
    if (!selected) {
      setSelectedDoc(null)
      return
    }
    documentFor(selected).then((d) => alive && setSelectedDoc(d))
    return () => {
      alive = false
    }
    // selectedKey captures the identity that matters (id + version).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey])
  const reloadSelectedDocument = async () => {
    if (selected) setSelectedDoc(await documentFor(selected))
  }

  const run = actionRunner({ setBusy, setError, setNotice, refresh, onRecordsChanged })
  const { reject, cancel } = closingActions(run, { rejectInvoice, cancelInvoice })

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

  // Approval records exactly what prints now (issuer, recipients, branding,
  // payment instructions, lines). Approving again refreshes that record.
  const approve = (inv: RentInvoiceRow) => run(() => approveInvoice(inv.id, inv.version), inv.id, 'Approved as shown. Issue it when you’re ready — issuing assigns the number.')

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
  // Renders the issued snapshot (never current settings) and stores it once.
  // A failure leaves the invoice issued with a visible "Store PDF" retry.
  const storePdf = async (inv: RentInvoiceRow) => {
    setBusy(true)
    try {
      if (!inv.issued_snapshot) throw new Error('This invoice has no issued record to print.')
      const s = inv.issued_snapshot
      const r = await renderSnapshot(s, { number: s.number, issuedAt: s.issued_at })
      const result = await attachIssuedInvoicePdf(inv, r.filename, await invoicePdfBlob(r))
      if (result.error) throw new Error(result.error.message)
      setError(null)
      setNotice(`PDF stored for ${s.number}.`)
    } catch (e) {
      setError(`${inv.number ?? 'The invoice'} is issued, but its PDF isn’t stored yet (${e instanceof Error ? e.message : String(e)}). Use “Store PDF” to try again — the invoice number doesn’t change.`)
    } finally {
      setBusy(false)
      setPdfNonce((n) => n + 1)
      onRecordsChanged()
    }
  }

  const revise = async (invoiceId: string, version: number) => {
    const id = await run(() => reviseInvoice(invoiceId, version) as PromiseLike<{ data: string; error: RpcError }>, null, 'Revision draft created. The issued invoice and its PDF stay unchanged until the revision is issued.')
    if (id) await refresh(id)
  }

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
    selectedDoc,
    reloadSelectedDocument,
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
