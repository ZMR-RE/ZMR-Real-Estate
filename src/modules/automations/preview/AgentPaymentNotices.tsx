import { useState } from 'react'
import { AgentAllocationEditor } from './AgentAllocationEditor'
import type { ApprovalActions } from './AgentApprovalsTab'
import { formatMoney, formatRunTime } from './agentFormat'
import { checkAllocations, possibleDuplicate } from './agentPayments'
import type { Agent, PaymentAllocation, PaymentNotice, RecordStore } from './agentTypes'

interface AgentPaymentNoticesProps {
  agent: Agent
  store: RecordStore
  actions: ApprovalActions
}

const OUTCOME: Record<Exclude<PaymentNotice['state'], 'pending'>, string> = {
  recorded: 'Recorded as one new payment in preview — not saved',
  linked: 'Linked as evidence to a recorded payment — no new entry',
  dismissed: 'Dismissed — not a rent payment',
}

function toAllocations(values: Record<string, string>): PaymentAllocation[] {
  return Object.entries(values)
    .map(([invoiceId, v]) => ({ invoiceId, amount: Math.round(Number(v) * 100) / 100 }))
    .filter((a) => Number.isFinite(a.amount) && a.amount > 0)
}

// Payment notifications are EVIDENCE. The owner records ONE new payment
// event (entering the split across invoices themselves, then confirming),
// links the notice to a payment already recorded, or dismisses it. Nothing
// settles or reconciles by itself, and no split is applied automatically.
export function AgentPaymentNotices({ agent, store, actions }: AgentPaymentNoticesProps) {
  const [recording, setRecording] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const ids = new Set(agent.assignments.map((a) => a.id))
  const notices = store.notices.filter((n) => n.assignmentId === null || ids.has(n.assignmentId))
  const tenant = (id: string | null) => agent.assignments.find((a) => a.id === id)

  if (notices.length === 0) return <p className="empty-state">No payment notifications to review.</p>

  const startRecording = (noticeId: string) => {
    setValues({})
    setRecording(noticeId)
  }

  return (
    <ul className="agents-approvals">
      {notices.map((n) => {
        const pending = n.state === 'pending'
        const t = tenant(n.assignmentId)
        const duplicate = pending ? possibleDuplicate(store, n) : null
        const isRecording = pending && recording === n.id && t
        const allocations = toAllocations(values)
        const check = t ? checkAllocations(store, t.id, n.amount, allocations) : null
        return (
          <li key={n.id} className={pending ? 'agents-approval agents-row--review' : 'agents-approval'}>
            <div className="agents-approval-head">
              <span className="agents-assignment-main">
                <span className="agents-assignment-name">{n.summary}</span>
                <span className="agents-row-meta">{formatRunTime(n.receivedAt)} · {n.sender}{n.reference ? ` · ref ${n.reference}` : ''}</span>
              </span>
              <span className="agents-assignment-rent">{formatMoney(n.amount)}</span>
            </div>

            {!pending ? (
              <p className="agents-row-meta">{OUTCOME[n.state as Exclude<PaymentNotice['state'], 'pending'>]}</p>
            ) : duplicate ? (
              <p className="agents-notice-flag">
                Possible duplicate: {formatMoney(duplicate.amount)} from {t?.tenantName} was already recorded on {duplicate.paidDate}. Link this notice as evidence instead of creating a second entry.
              </p>
            ) : t ? (
              <p className="agents-row-meta">Suggested payer: {t.tenantName}. Nothing is recorded until you enter the split and confirm.</p>
            ) : (
              <label className="agents-notice-match">
                No confident match. Choose the tenant, or mark it as not rent:
                <select value="" onChange={(e) => actions.matchNotice(n.id, e.target.value || null)}>
                  <option value="">Choose tenant…</option>
                  {agent.assignments.map((a) => <option key={a.id} value={a.id}>{a.tenantName} — {a.unitLabel}</option>)}
                </select>
              </label>
            )}

            {isRecording && check && (
              <>
                <AgentAllocationEditor store={store} assignmentId={t.id} paymentAmount={n.amount} values={values} onChange={setValues} check={check} idPrefix={`alloc-${n.id}`} />
                <p className="agents-notice-confirm" role="status">
                  This records {formatMoney(n.amount)} as one new, separate payment from {t.tenantName}.
                  {duplicate && ' It looks like a payment already recorded — this would count it twice.'}
                </p>
              </>
            )}

            {pending && (
              <div className="agents-approval-actions">
                <button type="button" className="agents-compact-button" onClick={() => actions.dismissNotice(n.id)}>Not a rent payment</button>
                {duplicate && !isRecording && (
                  <button type="button" className="agents-compact-button agents-compact-button--primary" onClick={() => actions.linkNotice(n.id, duplicate.id)}>Link as evidence</button>
                )}
                {t && !isRecording && (
                  <button type="button" className={duplicate ? 'agents-compact-button' : 'agents-compact-button agents-compact-button--primary'} onClick={() => startRecording(n.id)}>
                    {duplicate ? 'Record separately…' : 'Record payment…'}
                  </button>
                )}
                {isRecording && (
                  <>
                    <button type="button" className="agents-compact-button" onClick={() => setRecording(null)}>Cancel</button>
                    <button
                      type="button"
                      className="agents-compact-button agents-compact-button--primary"
                      disabled={!check?.ok}
                      onClick={() => {
                        actions.recordNotice(n.id, allocations, t.issuerEntityId)
                        setRecording(null)
                      }}
                    >
                      {check && check.allocated === 0 ? 'Confirm payment (nothing applied)' : 'Confirm payment and split'}
                    </button>
                  </>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
