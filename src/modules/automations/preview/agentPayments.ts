import { openInvoicesForTenant } from './agentRecords'
import type { PaymentAllocation, PaymentEvent, PaymentNotice, ReceiptRecord, RecordStore } from './agentTypes'

// Payment rules for the NON-SAVING preview. A payment notification is
// evidence only: nothing here settles an invoice or reconciles an account
// unless the owner explicitly records or links it. Each recorded payment is
// its own event; allocations say which invoices it pays.

function daysApart(a: string, b: string): number {
  return Math.abs(new Date(a.slice(0, 10)).getTime() - new Date(b.slice(0, 10)).getTime()) / 86_400_000
}

// A notice probably describes an already-recorded payment when the same
// tenant has a payment of the same amount within a day. Rent ops payments
// carry no reference number today, so this is only ever a warning.
export function possibleDuplicate(store: RecordStore, notice: PaymentNotice): PaymentEvent | null {
  if (!notice.assignmentId) return null
  return (
    store.payments.find(
      (p) => p.assignmentId === notice.assignmentId && p.amount === notice.amount && daysApart(p.paidDate, notice.receivedAt) <= 1 && !p.evidenceNoticeIds.includes(notice.id),
    ) ?? null
  )
}

// Payment splits are EXPLICIT owner-confirmed proposals: the owner enters
// how much of the payment goes to each open invoice. There is no approved
// default order (oldest-first was only a suggestion and is not applied).
// Whatever isn't allocated stays visibly unapplied on the payment.
export interface AllocationCheck {
  ok: boolean
  allocated: number
  unapplied: number
  errors: string[]
}

export function checkAllocations(store: RecordStore, assignmentId: string, amount: number, allocations: PaymentAllocation[]): AllocationCheck {
  const errors: string[] = []
  const open = new Map(openInvoicesForTenant(store, assignmentId).map((i) => [i.id, i]))
  let allocated = 0
  for (const al of allocations) {
    if (al.amount <= 0) continue
    const inv = open.get(al.invoiceId)
    if (!inv) {
      errors.push('An allocation points at an invoice that isn’t open for this tenant.')
      continue
    }
    const paid = store.payments.flatMap((p) => p.allocations).filter((x) => x.invoiceId === inv.id).reduce((sum, x) => sum + x.amount, 0)
    if (al.amount > Math.round((inv.amountDue - paid) * 100) / 100) errors.push(`More than the balance of ${inv.number ?? inv.periodLabel}.`)
    allocated += al.amount
  }
  allocated = Math.round(allocated * 100) / 100
  if (allocated > amount) errors.push('Allocations add up to more than the payment.')
  return { ok: errors.length === 0, allocated, unapplied: Math.round((amount - allocated) * 100) / 100, errors }
}

function setNotice(store: RecordStore, id: string, change: Partial<PaymentNotice>): PaymentNotice[] {
  return store.notices.map((n) => (n.id === id ? { ...n, ...change } : n))
}

// Owner confirmed: ONE new payment event with the owner's own allocations,
// plus a draft receipt from the tenant's issuer (when the receipts duty is
// on). Refused if the allocations don't validate or the notice was handled.
export function recordNoticeAsPayment(store: RecordStore, noticeId: string, allocationsInput: PaymentAllocation[], issuerEntityId: string | null, draftReceipt: boolean): RecordStore {
  const notice = store.notices.find((n) => n.id === noticeId)
  if (!notice || notice.state !== 'pending' || !notice.assignmentId) return store
  if (!checkAllocations(store, notice.assignmentId, notice.amount, allocationsInput).ok) return store
  const allocations = allocationsInput.filter((a) => a.amount > 0)
  const payment: PaymentEvent = {
    id: `pay-${notice.id}`,
    assignmentId: notice.assignmentId,
    amount: notice.amount,
    paidDate: notice.receivedAt.slice(0, 10),
    method: null,
    evidenceNoticeIds: [notice.id],
    allocations,
  }
  const receipt: ReceiptRecord = {
    kind: 'receipt',
    id: `rct-${payment.id}`,
    paymentId: payment.id,
    issuerEntityId,
    state: 'draft',
    number: null,
    revision: 1,
    revisionOf: null,
    documents: [],
    version: 1,
    materialVersion: 1,
    approvedMaterialVersion: null,
    approvalNote: null,
    createdBy: 'assistant',
    runId: null,
    editConflict: null,
    reviewBy: null,
  }
  return {
    ...store,
    payments: [...store.payments, payment],
    receipts: draftReceipt ? [...store.receipts, receipt] : store.receipts,
    notices: setNotice(store, noticeId, { state: 'recorded', outcomePaymentId: payment.id }),
  }
}

// Attach the notice as evidence to an already-recorded payment — no new
// financial entry.
export function linkNoticeToPayment(store: RecordStore, noticeId: string, paymentId: string): RecordStore {
  return {
    ...store,
    payments: store.payments.map((p) => (p.id === paymentId ? { ...p, evidenceNoticeIds: [...p.evidenceNoticeIds, noticeId] } : p)),
    notices: setNotice(store, noticeId, { state: 'linked', outcomePaymentId: paymentId }),
  }
}

export function dismissNotice(store: RecordStore, noticeId: string): RecordStore {
  return { ...store, notices: setNotice(store, noticeId, { state: 'dismissed' }) }
}

export function matchNotice(store: RecordStore, noticeId: string, assignmentId: string | null): RecordStore {
  return { ...store, notices: setNotice(store, noticeId, { assignmentId }) }
}
