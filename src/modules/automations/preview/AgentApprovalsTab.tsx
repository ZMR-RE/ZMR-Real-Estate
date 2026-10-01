import { CollapsibleSection } from '../../../shared/CollapsibleSection'
import { formatMoney } from './agentFormat'
import { AgentInvoiceApprovalCard } from './AgentInvoiceApprovalCard'
import { documentFilename, formatDocNumber, issueBlocker } from './agentNumbering'
import { AgentPaymentNotices } from './AgentPaymentNotices'
import { isApprovalValid, reviewCounts, workloadFor } from './agentRecords'
import type { InvoiceEdit } from './agentRecordEdits'
import { entityName, invoiceName } from './agentRecordLabels'
import type { Agent, ApprovalState, PaymentAllocation, RecordStore } from './agentTypes'

export interface ApprovalActions {
  editInvoice: (id: string, edit: InvoiceEdit) => void
  decideInvoice: (id: string, d: 'approve' | 'reject') => void
  issueInvoice: (id: string, assignmentId: string) => void
  decideReceipt: (id: string, d: 'approve' | 'reject') => void
  issueReceipt: (id: string, assignmentId: string) => void
  decideReminder: (id: string, state: ApprovalState) => void
  recordNotice: (noticeId: string, allocations: PaymentAllocation[], issuerEntityId: string | null) => void
  linkNotice: (noticeId: string, paymentId: string) => void
  dismissNotice: (noticeId: string) => void
  matchNotice: (noticeId: string, assignmentId: string | null) => void
}

interface AgentApprovalsTabProps {
  agent: Agent
  store: RecordStore
  actions: ApprovalActions
}

// Approvals is a FILTER of the shared records: draft/approved invoices and
// receipts, pending reminders and payment notifications. Nothing here is a
// copy — approving or editing changes the one record Rent ops also shows.
export function AgentApprovalsTab({ agent, store, actions }: AgentApprovalsTabProps) {
  const w = workloadFor(agent, store)
  const counts = reviewCounts(agent, store)
  const invoices = w.invoices.filter((i) => i.state === 'draft' || i.state === 'approved')
  const receipts = w.receipts.filter((r) => r.state === 'draft' || r.state === 'approved')
  const reminders = w.reminders.filter((r) => r.state === 'pending')
  const assignment = (id: string) => agent.assignments.find((a) => a.id === id)

  return (
    <div className="agents-overview">
      <CollapsibleSection title={`Invoices (${invoices.length})`} defaultOpen>
        {invoices.length === 0 ? (
          <p className="empty-state">No invoices waiting.</p>
        ) : (
          <ul className="agents-approvals">
            {invoices.map((inv) => (
              <AgentInvoiceApprovalCard
                key={inv.id}
                invoice={inv}
                assignment={assignment(inv.assignmentId)}
                store={store}
                onEdit={(edit) => actions.editInvoice(inv.id, edit)}
                onDecide={(d) => actions.decideInvoice(inv.id, d)}
                onIssue={() => actions.issueInvoice(inv.id, inv.assignmentId)}
              />
            ))}
          </ul>
        )}
      </CollapsibleSection>

      <CollapsibleSection title={`Receipts (${receipts.length})`} defaultOpen={receipts.length > 0}>
        {receipts.length === 0 ? (
          <p className="empty-state">No receipts waiting.</p>
        ) : (
          <ul className="agents-approvals">
            {receipts.map((r) => {
              const payment = store.payments.find((p) => p.id === r.paymentId)
              const a = payment && assignment(payment.assignmentId)
              const entity = store.entities.find((e) => e.id === r.issuerEntityId)
              const blocker = issueBlocker(entity)
              const number = entity?.shortCode ? formatDocNumber(entity, 'receipt', entity.nextReceiptSeq) : null
              return (
                <li key={r.id} className="agents-approval agents-row--review">
                  <div className="agents-approval-head">
                    <span className="agents-assignment-main">
                      <span className="agents-assignment-name">Receipt · {a?.tenantName} · payment {payment?.paidDate}</span>
                      <span className="agents-row-meta">Issuer {entityName(store, r.issuerEntityId) ?? 'not chosen'}</span>
                    </span>
                    <span className="agents-assignment-rent">{payment && formatMoney(payment.amount)}</span>
                  </div>
                  {number && payment && a && (
                    <p className="agents-row-meta agents-file">If issued: {number} · {documentFilename(number, payment.paidDate, a.unitLabel)}</p>
                  )}
                  <div className="agents-approval-actions">
                    {blocker && <span className="agents-row-meta">{blocker}</span>}
                    <button type="button" className="agents-compact-button" onClick={() => actions.decideReceipt(r.id, 'reject')}>Reject</button>
                    {isApprovalValid(r) ? (
                      <button type="button" className="agents-compact-button agents-compact-button--primary" disabled={blocker !== null} onClick={() => payment && actions.issueReceipt(r.id, payment.assignmentId)}>Issue (preview)</button>
                    ) : (
                      <button type="button" className="agents-compact-button agents-compact-button--primary" onClick={() => actions.decideReceipt(r.id, 'approve')}>Approve</button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CollapsibleSection>

      <CollapsibleSection title={`Reminders (${reminders.length})`} defaultOpen={reminders.length > 0}>
        {reminders.length === 0 ? (
          <p className="empty-state">No reminders waiting.</p>
        ) : (
          <ul className="agents-approvals">
            {reminders.map((r) => {
              const inv = store.invoices.find((i) => i.id === r.invoiceId)
              return (
                <li key={r.id} className="agents-approval agents-row--review">
                  <div className="agents-approval-head">
                    <span className="agents-assignment-main">
                      <span className="agents-assignment-name">Reminder · {inv && assignment(inv.assignmentId)?.tenantName} · {inv && invoiceName(inv)}</span>
                      <span className="agents-row-meta">{inv?.periodLabel} rent, due {inv?.dueDate}. Would route through the Action queue; nothing is sent.</span>
                    </span>
                  </div>
                  <div className="agents-approval-actions">
                    <button type="button" className="agents-compact-button" onClick={() => actions.decideReminder(r.id, 'rejected')}>Reject</button>
                    <button type="button" className="agents-compact-button agents-compact-button--primary" onClick={() => actions.decideReminder(r.id, 'approved')}>Approve</button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CollapsibleSection>

      <CollapsibleSection title={`Payment notifications (${counts.notices})`} defaultOpen>
        <p className="field-hint">Samples only — no mailbox is connected. A notification is evidence: it never marks an invoice paid or reconciles an account on its own.</p>
        <AgentPaymentNotices agent={agent} store={store} actions={actions} />
      </CollapsibleSection>
    </div>
  )
}
