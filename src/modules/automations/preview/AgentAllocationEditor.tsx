import { formatMoney } from './agentFormat'
import type { AllocationCheck } from './agentPayments'
import { invoiceBalance, openInvoicesForTenant } from './agentRecords'
import { invoiceName } from './agentRecordLabels'
import type { RecordStore } from './agentTypes'

interface AgentAllocationEditorProps {
  store: RecordStore
  assignmentId: string
  paymentAmount: number
  values: Record<string, string>
  onChange: (next: Record<string, string>) => void
  check: AllocationCheck
  idPrefix: string
}

// The owner enters how much of ONE payment goes to each open invoice. Starts
// empty — no automatic order is applied. "Fill balance" is a per-invoice
// shortcut the owner chooses; anything left stays unapplied, visibly.
export function AgentAllocationEditor({ store, assignmentId, paymentAmount, values, onChange, check, idPrefix }: AgentAllocationEditorProps) {
  const open = openInvoicesForTenant(store, assignmentId)
  if (open.length === 0) return <p className="agents-row-meta">This tenant has no open invoices; the whole payment would stay unapplied.</p>

  return (
    <div className="agents-allocation">
      <p className="agents-row-meta">Split {formatMoney(paymentAmount)} across open invoices (you decide each amount):</p>
      <ul className="agents-assignments">
        {open.map((inv) => {
          const balance = invoiceBalance(store, inv)
          const id = `${idPrefix}-${inv.id}`
          return (
            <li key={inv.id} className="agents-assignment">
              <label htmlFor={id} className="agents-allocation-label">
                {invoiceName(inv)} · {inv.periodLabel}
                <span className="agents-row-meta agents-block">Balance {formatMoney(balance)}</span>
              </label>
              <span className="agents-assignment-side">
                <input
                  id={id}
                  className="agents-allocation-input"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={values[inv.id] ?? ''}
                  onChange={(e) => onChange({ ...values, [inv.id]: e.target.value })}
                />
                <button type="button" className="agents-compact-button" onClick={() => onChange({ ...values, [inv.id]: balance.toFixed(2) })}>
                  Fill balance
                </button>
              </span>
            </li>
          )
        })}
      </ul>
      <p className="agents-row-meta">
        Allocated {formatMoney(check.allocated)} · left unapplied {formatMoney(Math.max(0, check.unapplied))}
      </p>
      {check.errors.map((e) => (
        <p key={e} className="agents-notice-flag">{e}</p>
      ))}
    </div>
  )
}
