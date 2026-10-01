import type { InvoiceStatus } from './agentRecords'
import type { DocState, InvoiceRecord, RecordStore } from './agentTypes'

// Shared display helpers so Workload, Approvals and the Rent ops view name
// the same record the same way.

export function invoiceName(inv: InvoiceRecord): string {
  return inv.number ?? (inv.revision > 1 ? `Draft revision ${inv.revision}` : 'Draft')
}

export function entityName(store: RecordStore, id: string | null): string | null {
  return store.entities.find((e) => e.id === id)?.legalName ?? null
}

export const DOC_STATE_LABEL: Record<DocState, string> = {
  draft: 'Draft',
  approved: 'Approved — ready to issue',
  issued: 'Issued',
  superseded: 'Superseded (kept)',
  cancelled: 'Cancelled (number kept)',
  rejected: 'Rejected',
}

export const PAY_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Not issued',
  paid: 'Paid',
  partial: 'Partly paid',
  overdue: 'Overdue',
  pending: 'Not yet due',
}

export const PAY_STATUS_BADGE: Record<InvoiceStatus, string> = {
  draft: 'status-badge-neutral',
  paid: 'status-badge-success',
  partial: 'status-badge-warning',
  overdue: 'status-badge-danger',
  pending: 'status-badge-neutral',
}
