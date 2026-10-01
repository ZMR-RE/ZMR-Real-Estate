import './rentInvoices.css'
import { formatMoney, periodLabel } from './invoiceDocument'
import { InvoiceReviewPanel } from './InvoiceReviewPanel'
import { IssuedInvoicePanel } from './IssuedInvoicePanel'
import { detailPanelFor, STATE_LABEL, tenancyLabel } from './invoiceWorkflowLogic'
import { NewInvoicePanel } from './NewInvoicePanel'
import type { InvoiceWorkflow } from './useInvoiceWorkflow'

interface InvoiceWorkflowSectionProps {
  workflow: InvoiceWorkflow
}

// Rent ops → invoices to review. Drafts (yours or the assistant's) and
// approved invoices awaiting issue — the same records the assistant's
// Workload and Approvals show.
export function InvoiceWorkflowSection({ workflow: w }: InvoiceWorkflowSectionProps) {
  const tenancyFor = (leaseId: string | null) => w.tenancies.find((t) => t.id === leaseId)
  const selected = w.selected

  return (
    <section className="invoice-workflow" aria-label="Invoices to review">
      <div className="page-header-row">
        <h2 className="invoice-section-title">Invoices to review</h2>
        {!w.creating && (
          <button type="button" onClick={w.startCreating}>+ New invoice</button>
        )}
      </div>
      {w.error && <p className="invoice-callout invoice-callout--error" role="alert">{w.error}</p>}
      {w.notice && <p className="invoice-callout invoice-callout--ok" role="status">{w.notice}</p>}

      {w.creating && (
        <NewInvoicePanel
          tenancies={w.tenancies}
          busy={w.busy}
          onOpenPicker={w.refreshOptions}
          checkBlockers={w.checkBlockers}
          onSave={w.createDraft}
          onCancel={w.stopCreating}
        />
      )}

      {w.awaiting.length === 0 ? (
        <p className="empty-state">No drafts or approved invoices waiting.</p>
      ) : (
        <div className="table-scroll">
          <table className="invoice-awaiting-table">
            <thead>
              <tr>
                <th scope="col">Tenancy</th>
                <th scope="col">Month</th>
                <th scope="col">Amount</th>
                <th scope="col">Status</th>
                <th scope="col">From</th>
              </tr>
            </thead>
            <tbody>
              {w.awaiting.map((inv) => {
                const t = tenancyFor(inv.lease_id)
                return (
                  <tr key={inv.id} className={selected?.id === inv.id ? 'invoice-row invoice-row--selected' : 'invoice-row'}>
                    <td>
                      <button type="button" className="invoice-row-open" aria-current={selected?.id === inv.id ? 'true' : undefined} onClick={() => w.select(inv)}>
                        {t ? tenancyLabel(t) : inv.recipient_name ?? 'Tenancy'}
                      </button>
                    </td>
                    <td>{periodLabel(inv.period_start)}</td>
                    <td>{formatMoney(Number(inv.amount_due))}</td>
                    <td><span className="status-badge status-badge-warning">{STATE_LABEL[inv.state]}</span></td>
                    <td>{inv.created_via === 'assistant' ? 'Assistant' : 'You'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && detailPanelFor(selected) === 'review' && (
        <InvoiceReviewPanel invoice={selected} tenancy={tenancyFor(selected.lease_id)} issuers={w.issuers} workflow={w} />
      )}
      {selected && detailPanelFor(selected) === 'issued' && (
        <IssuedInvoicePanel invoice={selected} workflow={w} />
      )}
    </section>
  )
}
