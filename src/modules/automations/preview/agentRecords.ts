import type { Agent, InvoiceRecord, PaymentEvent, ReceiptRecord, RecordStore, ReminderDraft } from './agentTypes'

// Filtered VIEWS over the one account record store. Rent ops, the agent's
// Workload and Approvals all call these on the same records — there is no
// agent-side copy to drift out of sync.

export type InvoiceStatus = 'draft' | 'paid' | 'partial' | 'overdue' | 'pending'

export interface Workload {
  invoices: InvoiceRecord[]
  payments: PaymentEvent[]
  receipts: ReceiptRecord[]
  reminders: ReminderDraft[]
}

export function workloadFor(agent: Agent, store: RecordStore): Workload {
  const ids = new Set(agent.assignments.map((a) => a.id))
  const invoices = store.invoices.filter((i) => ids.has(i.assignmentId))
  const invoiceIds = new Set(invoices.map((i) => i.id))
  const payments = store.payments.filter((p) => ids.has(p.assignmentId))
  const paymentIds = new Set(payments.map((p) => p.id))
  return {
    invoices,
    payments,
    receipts: store.receipts.filter((r) => paymentIds.has(r.paymentId)),
    reminders: store.reminders.filter((r) => invoiceIds.has(r.invoiceId)),
  }
}

export function allocatedTo(store: RecordStore, invoiceId: string): number {
  return store.payments.flatMap((p) => p.allocations).filter((a) => a.invoiceId === invoiceId).reduce((s, a) => s + a.amount, 0)
}

export function invoiceBalance(store: RecordStore, invoice: InvoiceRecord): number {
  return Math.round((invoice.amountDue - allocatedTo(store, invoice.id)) * 100) / 100
}

export function unallocated(payment: PaymentEvent): number {
  return Math.round((payment.amount - payment.allocations.reduce((s, a) => s + a.amount, 0)) * 100) / 100
}

// Only issued invoices carry a payment status — a draft is never "pending"
// or "overdue" (the gap today's Rent ops has, since it stores no state).
export function invoiceStatus(store: RecordStore, invoice: InvoiceRecord, today: string): InvoiceStatus {
  if (invoice.state !== 'issued') return 'draft'
  const balance = invoiceBalance(store, invoice)
  if (balance <= 0) return 'paid'
  if (balance < invoice.amountDue) return 'partial'
  return invoice.dueDate !== null && invoice.dueDate < today ? 'overdue' : 'pending'
}

// Open (issued, unpaid) invoices for one tenant, listed by due date for
// display. The listing order is NOT an allocation rule — the owner enters
// every split explicitly.
export function openInvoicesForTenant(store: RecordStore, assignmentId: string): InvoiceRecord[] {
  return store.invoices
    .filter((i) => i.assignmentId === assignmentId && i.state === 'issued' && invoiceBalance(store, i) > 0)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
}

export function isApprovalValid(doc: InvoiceRecord | ReceiptRecord): boolean {
  return doc.state === 'approved' && doc.approvedMaterialVersion === doc.materialVersion
}

// Items that need a human decision — drives the light-yellow row.
export function reviewCounts(agent: Agent, store: RecordStore) {
  const w = workloadFor(agent, store)
  const ids = new Set(agent.assignments.map((a) => a.id))
  // Unmatched notices belong to whichever agent reviews payment notices for
  // this account's tenants (one rent-cycle specialist).
  const reviewsNotices = ids.size > 0 && agent.duties.some((d) => d.id === 'payment_notices' && d.enabled)
  return {
    invoices: w.invoices.filter((i) => i.state === 'draft' || i.state === 'approved').length,
    receipts: w.receipts.filter((r) => r.state === 'draft' || r.state === 'approved').length,
    reminders: w.reminders.filter((r) => r.state === 'pending').length,
    notices: reviewsNotices ? store.notices.filter((n) => n.state === 'pending' && (n.assignmentId === null || ids.has(n.assignmentId))).length : 0,
    conflicts: [...w.invoices, ...w.receipts].filter((d) => d.editConflict !== null && (d.state === 'draft' || d.state === 'approved')).length,
  }
}

export function totalToReview(agent: Agent, store: RecordStore): number {
  const c = reviewCounts(agent, store)
  return c.invoices + c.receipts + c.reminders + c.notices
}

export function overdueReviewCount(agent: Agent, store: RecordStore, today: string): number {
  const w = workloadFor(agent, store)
  const pending = [
    ...w.invoices.filter((i) => i.state === 'draft' || i.state === 'approved'),
    ...w.receipts.filter((r) => r.state === 'draft' || r.state === 'approved'),
    ...w.reminders.filter((r) => r.state === 'pending'),
  ]
  return pending.filter((d) => d.reviewBy !== null && d.reviewBy < today).length
}
