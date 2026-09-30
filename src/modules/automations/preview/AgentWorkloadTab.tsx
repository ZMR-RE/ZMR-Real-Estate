import { useState } from 'react'
import { CollapsibleSection } from '../../../shared/CollapsibleSection'
import { formatMoney } from './agentFormat'
import { invoiceBalance, invoiceStatus, unallocated, workloadFor } from './agentRecords'
import { DOC_STATE_LABEL, entityName, invoiceName, PAY_STATUS_BADGE, PAY_STATUS_LABEL } from './agentRecordLabels'
import type { Agent, RecordStore } from './agentTypes'

interface AgentWorkloadTabProps {
  agent: Agent
  store: RecordStore
  today: string
  onRevise: (invoiceId: string) => void
  onCancel: (invoiceId: string) => void
}

// The assistant's Workload: a per-tenant FILTER of the account's Rent ops
// records — the same invoices, payments and receipts Rent ops shows, not
// copies. Issued documents change only through an explicit revision.
export function AgentWorkloadTab({ agent, store, today, onRevise, onCancel }: AgentWorkloadTabProps) {
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)
  const w = workloadFor(agent, store)
  const numberOf = (invoiceId: string) => {
    const inv = store.invoices.find((i) => i.id === invoiceId)
    return inv ? `${invoiceName(inv)} (${inv.periodLabel})` : invoiceId
  }

  if (agent.assignments.length === 0) return <p className="empty-state">No tenants assigned.</p>

  return (
    <div className="agents-overview">
      <p className="field-hint">Same records as Rent ops — an edit here or there shows in both, and in Approvals.</p>
      {agent.assignments.map((a, index) => {
        const invoices = w.invoices.filter((i) => i.assignmentId === a.id && i.state !== 'rejected')
        const payments = w.payments.filter((p) => p.assignmentId === a.id)
        const receipts = w.receipts.filter((r) => payments.some((p) => p.id === r.paymentId))
        const issuer = entityName(store, a.issuerEntityId)
        return (
          <CollapsibleSection key={a.id} title={`${a.tenantName} — ${a.unitLabel}`} defaultOpen={index === 0}>
            <p className="agents-row-meta">Issuer: {issuer ?? 'not chosen — several owners'} · {a.leaseLabel}</p>

            <h4 className="property-details-title">Invoices</h4>
            {invoices.length === 0 ? (
              <p className="empty-state">No invoices yet.</p>
            ) : (
              <div className="table-scroll">
                <table className="agents-table">
                  <thead>
                    <tr>
                      <th scope="col">Number</th>
                      <th scope="col">Period</th>
                      <th scope="col">Amount</th>
                      <th scope="col">Due</th>
                      <th scope="col">State</th>
                      <th scope="col">Balance</th>
                      <th scope="col">Files</th>
                      <th scope="col"><span className="agents-visually-hidden">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => {
                      const status = invoiceStatus(store, inv, today)
                      const canRevise = inv.state === 'issued' && !store.invoices.some((x) => x.revisionOf === inv.id && x.state !== 'rejected')
                      return (
                        <tr key={inv.id} className={inv.state === 'superseded' || inv.state === 'cancelled' ? 'row-voided' : undefined}>
                          <td>{invoiceName(inv)}</td>
                          <td>{inv.periodLabel}</td>
                          <td>{formatMoney(inv.amountDue)}</td>
                          <td>{inv.dueDate ?? ''}</td>
                          <td>
                            {inv.state === 'issued' ? (
                              <span className={`status-badge ${PAY_STATUS_BADGE[status]}`}>{PAY_STATUS_LABEL[status]}</span>
                            ) : (
                              <span className="status-badge status-badge-neutral">{DOC_STATE_LABEL[inv.state]}</span>
                            )}
                          </td>
                          <td>{inv.state === 'issued' ? formatMoney(invoiceBalance(store, inv)) : ''}</td>
                          <td>{inv.documents.map((d) => <span key={d.filename} className="agents-file">{d.filename}</span>)}</td>
                          <td className="agents-row-actions">
                            {canRevise && confirmCancel !== inv.id && (
                              <>
                                <button type="button" className="agents-compact-button" onClick={() => onRevise(inv.id)}>Revise</button>
                                <button type="button" className="agents-compact-button" onClick={() => setConfirmCancel(inv.id)}>Cancel…</button>
                              </>
                            )}
                            {confirmCancel === inv.id && (
                              <>
                                <span className="agents-row-meta">Cancel {inv.number}? The number is kept and never reused.</span>
                                <button type="button" className="agents-compact-button" onClick={() => setConfirmCancel(null)}>Keep</button>
                                <button type="button" className="agents-compact-button agents-compact-button--primary" onClick={() => { onCancel(inv.id); setConfirmCancel(null) }}>Confirm cancel</button>
                              </>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <h4 className="property-details-title">Payments</h4>
            {payments.length === 0 ? (
              <p className="empty-state">No payments recorded.</p>
            ) : (
              <ul className="agents-assignments">
                {payments.map((p) => {
                  const rct = receipts.find((r) => r.paymentId === p.id)
                  return (
                    <li key={p.id} className="agents-check">
                      <div className="agents-approval-head">
                        <span className="agents-assignment-name">{formatMoney(p.amount)} on {p.paidDate}{p.method ? ` · ${p.method}` : ''}</span>
                        <span className="agents-row-meta">
                          Receipt: {rct ? (rct.number ?? DOC_STATE_LABEL[rct.state]) : 'none'}
                        </span>
                      </div>
                      <ul className="agents-check-results">
                        {p.allocations.map((al) => (
                          <li key={al.invoiceId}>
                            <span className="agents-check-subject">Applied to {numberOf(al.invoiceId)}</span>
                            <span>{formatMoney(al.amount)}</span>
                          </li>
                        ))}
                        {unallocated(p) > 0 && (
                          <li><span className="agents-check-subject">Not yet applied</span><span>{formatMoney(unallocated(p))}</span></li>
                        )}
                      </ul>
                      {p.evidenceNoticeIds.length > 0 && <p className="agents-row-meta">Payment notification attached as evidence</p>}
                    </li>
                  )
                })}
              </ul>
            )}
          </CollapsibleSection>
        )
      })}
    </div>
  )
}
