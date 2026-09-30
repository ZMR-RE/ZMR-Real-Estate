import { commitNumber, numberInUse, reserveNumber, type NumberReservation } from './agentIssuance'
import { baseOf, documentFilename, issueBlocker, revisionNumber } from './agentNumbering'
import { isApprovalValid } from './agentRecords'
import type { ApprovalState, InvoiceRecord, ReceiptRecord, RecordStore } from './agentTypes'

// In-memory record transitions for the NON-SAVING preview. Each returns a
// new RecordStore. Rules demonstrated:
// - Drafts are edited in place (one record), so edits show everywhere.
// - ANY change to what the tenant receives — recipient, amount, dates,
//   issuer, visible note, attachments — clears an existing approval. Only a
//   strictly internal note (never rendered or delivered) is exempt.
// - Issued documents are never edited: an explicit revision is created and
//   the earlier PDF and its delivery history are kept.
// - An assistant change is applied only against the version it read; a
//   newer edit wins and the conflict is surfaced for review.
// - Every issue path takes its number from agentIssuance (entity × doc-type
//   protection), never directly.

export interface InvoiceEdit {
  amountDue?: number
  dueDate?: string | null
  issuerEntityId?: string | null
  recipientName?: string
  recipientEmail?: string | null
  visibleNote?: string
  attachmentIds?: string[]
  internalNote?: string
}

const FIELD_LABEL: Record<keyof InvoiceEdit, string> = {
  amountDue: 'amount',
  dueDate: 'due date',
  issuerEntityId: 'issuer',
  recipientName: 'recipient',
  recipientEmail: 'recipient email',
  visibleNote: 'note shown on the invoice',
  attachmentIds: 'attachments',
  internalNote: 'internal note',
}

// The only non-material field.
const NON_MATERIAL: (keyof InvoiceEdit)[] = ['internalNote']

function same(a: unknown, b: unknown): boolean {
  return Array.isArray(a) && Array.isArray(b) ? a.length === b.length && a.every((x, i) => x === b[i]) : a === b
}

function mapInvoice(store: RecordStore, id: string, change: (i: InvoiceRecord) => InvoiceRecord): RecordStore {
  return { ...store, invoices: store.invoices.map((i) => (i.id === id ? change(i) : i)) }
}

function mapReceipt(store: RecordStore, id: string, change: (r: ReceiptRecord) => ReceiptRecord): RecordStore {
  return { ...store, receipts: store.receipts.map((r) => (r.id === id ? change(r) : r)) }
}

export function editInvoice(store: RecordStore, id: string, edit: InvoiceEdit): RecordStore {
  return mapInvoice(store, id, (inv) => {
    if (inv.state !== 'draft' && inv.state !== 'approved') return inv
    const changed = (Object.keys(edit) as (keyof InvoiceEdit)[]).filter((k) => edit[k] !== undefined && !same(edit[k], inv[k]))
    if (changed.length === 0) return inv
    const material = changed.filter((k) => !NON_MATERIAL.includes(k))
    const next: InvoiceRecord = { ...inv, ...edit, version: inv.version + 1 }
    if (material.length === 0) return next
    next.materialVersion = inv.materialVersion + 1
    if (inv.state === 'approved') {
      next.state = 'draft'
      next.approvedMaterialVersion = null
      next.approvalNote = `Approval cleared: ${material.map((k) => FIELD_LABEL[k]).join(', ')} changed after approval.`
    }
    return next
  })
}

// Optimistic concurrency: the assistant passes the version it read when its
// run started. If the record moved on, its change is held, not applied.
export function applyAssistantEdit(store: RecordStore, id: string, readVersion: number, edit: InvoiceEdit, runId: string): RecordStore {
  const current = store.invoices.find((i) => i.id === id)
  if (!current) return store
  if (current.version !== readVersion) {
    return mapInvoice(store, id, (inv) => ({
      ...inv,
      editConflict: `Changed by you while run ${runId} was working. The assistant’s update was not applied over your edit — review before approving.`,
    }))
  }
  return editInvoice(store, id, edit)
}

export function decideInvoice(store: RecordStore, id: string, decision: 'approve' | 'reject'): RecordStore {
  return mapInvoice(store, id, (inv) =>
    decision === 'approve'
      ? { ...inv, state: 'approved', approvedMaterialVersion: inv.materialVersion, approvalNote: null, editConflict: null }
      : { ...inv, state: 'rejected', approvalNote: null },
  )
}

export function decideReceipt(store: RecordStore, id: string, decision: 'approve' | 'reject'): RecordStore {
  return mapReceipt(store, id, (r) =>
    decision === 'approve' ? { ...r, state: 'approved', approvedMaterialVersion: r.materialVersion, approvalNote: null } : { ...r, state: 'rejected' },
  )
}

export function decideReminder(store: RecordStore, id: string, state: ApprovalState): RecordStore {
  return { ...store, reminders: store.reminders.map((r) => (r.id === id ? { ...r, state } : r)) }
}

export function invoiceIssueBlocker(store: RecordStore, inv: InvoiceRecord): string | null {
  if (!isApprovalValid(inv)) return 'Approve it first.'
  if (inv.dueDate === null) return 'Set a due date first.'
  if (inv.revisionOf === null) return issueBlocker(store.entities.find((e) => e.id === inv.issuerEntityId))
  return null
}

// Issue with a reservation made earlier (another path may have issued in
// between). Returns null when the reservation is stale — nothing written.
export function issueInvoiceWith(store: RecordStore, id: string, reservation: NumberReservation | null, unitLabel: string, issuedAt: string): RecordStore | null {
  const inv = store.invoices.find((i) => i.id === id)
  if (!inv || invoiceIssueBlocker(store, inv)) return null
  let next: RecordStore | null = store
  let number: string
  if (inv.revisionOf) {
    // A revision keeps its original number with an -R suffix; it never takes
    // a new sequence number, but must still be unique.
    const original = store.invoices.find((i) => i.id === inv.revisionOf)
    number = revisionNumber(baseOf(original?.number ?? 'UNNUMBERED'), inv.revision)
    if (numberInUse(store, number)) return null
  } else {
    if (!reservation || reservation.entityId !== inv.issuerEntityId || reservation.kind !== 'invoice') return null
    next = commitNumber(store, reservation)
    if (!next) return null
    number = reservation.number
  }
  const doc = { revision: inv.revision, filename: documentFilename(number, inv.periodKey, unitLabel), issuedAt, deliveries: [] }
  return {
    ...next,
    invoices: next.invoices.map((i) => {
      if (i.id === id) return { ...i, state: 'issued' as const, number, documents: [...i.documents, doc] }
      if (i.id === inv.revisionOf) return { ...i, state: 'superseded' as const }
      return i
    }),
  }
}

// The normal path: reserve and commit in one step (one transaction).
export function issueInvoice(store: RecordStore, id: string, unitLabel: string, issuedAt: string): RecordStore {
  const inv = store.invoices.find((i) => i.id === id)
  if (!inv) return store
  const reservation = inv.revisionOf ? null : reserveNumber(store, inv.issuerEntityId, 'invoice')
  if (reservation && 'error' in reservation) return store
  return issueInvoiceWith(store, id, reservation, unitLabel, issuedAt) ?? store
}

export function issueReceipt(store: RecordStore, id: string, unitLabel: string, issuedAt: string): RecordStore {
  const rct = store.receipts.find((r) => r.id === id)
  const payment = rct && store.payments.find((p) => p.id === rct.paymentId)
  if (!rct || !payment || !isApprovalValid(rct)) return store
  const reservation = reserveNumber(store, rct.issuerEntityId, 'receipt')
  if ('error' in reservation) return store
  const next = commitNumber(store, reservation)
  if (!next) return store
  const doc = { revision: 1, filename: documentFilename(reservation.number, payment.paidDate, unitLabel), issuedAt, deliveries: [] }
  return mapReceipt(next, id, (r) => ({ ...r, state: 'issued', number: reservation.number, documents: [doc] }))
}

// Explicit revision of an issued invoice: a new draft record linked to the
// original. The original, its PDF and its delivery history stay untouched
// until the revision is issued (then it's marked superseded, still kept).
export function reviseInvoice(store: RecordStore, id: string): RecordStore {
  const inv = store.invoices.find((i) => i.id === id)
  if (!inv || inv.state !== 'issued') return store
  if (store.invoices.some((i) => i.revisionOf === id && i.state !== 'rejected')) return store
  const revision: InvoiceRecord = {
    ...inv,
    id: `${inv.id}-r${inv.revision + 1}`,
    state: 'draft',
    number: null,
    revision: inv.revision + 1,
    revisionOf: inv.id,
    documents: [],
    version: 1,
    materialVersion: 1,
    approvedMaterialVersion: null,
    approvalNote: null,
    createdBy: 'owner',
    runId: null,
    editConflict: null,
  }
  return { ...store, invoices: [...store.invoices, revision] }
}

// Cancel an issued invoice: it keeps its number, PDF and delivery history,
// and the issuer's sequence is never rewound — the number is not reused.
export function cancelInvoice(store: RecordStore, id: string): RecordStore {
  return mapInvoice(store, id, (inv) => (inv.state === 'issued' ? { ...inv, state: 'cancelled' } : inv))
}

// Owner-created invoice (the manual Rent ops path). It is a draft in the
// same table and later issues through the same allocator as every other
// path — there is no separate numbering route for manual invoices.
export function createOwnerInvoice(store: RecordStore, draft: InvoiceRecord): RecordStore {
  return { ...store, invoices: [...store.invoices, { ...draft, state: 'draft', number: null, createdBy: 'owner', runId: null }] }
}
