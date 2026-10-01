import { useState } from 'react'
import { EditableSection } from '../../shared/EditableSection'
import { formatMoney, paymentInstructionsSource, periodLabel } from './invoiceDocument'
import { InvoiceEditForm } from './InvoiceEditForm'
import { InvoicePdfPreview } from './InvoicePdfPreview'
import { STATE_LABEL } from './invoiceWorkflowLogic'
import type { IssuerRow, TenancyOptionRow } from './rentInvoicesQueries'
import type { RentInvoiceRow } from './rentInvoiceTypes'
import type { InvoiceWorkflow } from './useInvoiceWorkflow'

interface InvoiceReviewPanelProps {
  invoice: RentInvoiceRow
  tenancy: TenancyOptionRow | undefined
  issuers: IssuerRow[]
  workflow: InvoiceWorkflow
}

// One invoice record under review: view-only by default, Edit top-right,
// decision actions beside it. Everything shown under "What prints" and the
// PDF preview come from the database's print snapshot — the same content
// approval records and issue re-checks.
export function InvoiceReviewPanel({ invoice, tenancy, issuers, workflow }: InvoiceReviewPanelProps) {
  const [confirm, setConfirm] = useState<'issue' | 'reject' | null>(null)
  const [reason, setReason] = useState('')
  const issuer = issuers.find((i) => i.id === invoice.billing_entity_id)
  const doc = workflow.selectedDoc?.invoiceId === invoice.id && workflow.selectedDoc.version === invoice.version ? workflow.selectedDoc : null
  const snap = doc?.snapshot ?? null
  const changed = doc?.changedSinceApproval ?? []
  const approvalValid = invoice.state === 'approved' && invoice.approved_material_version === invoice.material_version && changed.length === 0
  const instructionsSource = snap ? paymentInstructionsSource(snap) : null
  const issueBlocker = !issuer ? 'Choose the invoice issuer (Edit).' : !issuer.invoice_code ? `${issuer.display_name || issuer.name} has no invoice code yet — add one on their profile (Invoicing).` : null
  const nextNumber = issuer?.invoice_code ? `${issuer.invoice_code}-INV-…` : null

  const actions = (
    <span className="invoice-decision-actions">
      {(invoice.state === 'draft' || (invoice.state === 'approved' && changed.length > 0)) && (
        <button type="button" className="invoice-compact-button invoice-compact-button--primary" disabled={workflow.busy || !doc || !!doc.problem} onClick={() => workflow.approve(invoice)}>
          {invoice.state === 'approved' ? 'Approve again' : 'Approve'}
        </button>
      )}
      {approvalValid && (
        <button type="button" className="invoice-compact-button invoice-compact-button--primary" disabled={workflow.busy || !!issueBlocker} onClick={() => setConfirm('issue')}>Issue…</button>
      )}
      <button type="button" className="invoice-compact-button" disabled={workflow.busy} onClick={() => setConfirm('reject')}>Reject…</button>
    </span>
  )

  const view = (
    <div className="invoice-review">
      <dl className="field-grid invoice-review-facts">
        <div className="field"><dt>Status</dt><dd>{STATE_LABEL[invoice.state]}</dd></div>
        <div className="field"><dt>Billing month</dt><dd>{periodLabel(invoice.period_start)}</dd></div>
        <div className="field"><dt>Due date</dt><dd>{invoice.due_date}</dd></div>
        <div className="field"><dt>Amount</dt><dd>{formatMoney(Number(invoice.amount_due))}</dd></div>
        <div className="field"><dt>Invoice issuer</dt><dd>{issuer ? issuer.display_name || issuer.name : 'Not chosen'}</dd></div>
        {invoice.internal_note && <div className="field"><dt>Internal note (never sent)</dt><dd>{invoice.internal_note}</dd></div>}
        <div className="field"><dt>Created by</dt><dd>{invoice.created_via === 'assistant' ? 'Rent & Payments Assistant' : 'You'}</dd></div>
      </dl>
      {changed.length > 0 && (
        <p className="invoice-callout" role="status">
          Changed since you approved it: {changed.join(', ')}. Review the preview and approve again before issuing.
        </p>
      )}
      {invoice.state === 'approved' && changed.length === 0 && issueBlocker && <p className="invoice-callout">{issueBlocker}</p>}

      {snap && (
        <>
          <h3 className="property-field-group-title">What prints</h3>
          <dl className="field-grid invoice-review-facts">
            {snap.recipients.length > 0 ? (
              <div className="field">
                <dt>Bill to</dt>
                <dd>
                  {snap.recipients.map((r) => (
                    <span key={r.tenant_id} className="invoice-recipient">
                      {r.name}
                      {[r.email, r.phone].filter(Boolean).length > 0 && <span className="field-hint"> · {[r.email, r.phone].filter(Boolean).join(' · ')}</span>}
                    </span>
                  ))}
                </dd>
              </div>
            ) : (
              <div className="field"><dt>Bill to</dt><dd className="invoice-callout">No billed tenants — choose one under the tenant’s Tenancy &amp; billing.</dd></div>
            )}
            {snap.payment_instructions.text ? (
              <div className="field">
                <dt>How to pay</dt>
                <dd>
                  {snap.payment_instructions.text}
                  {instructionsSource && <span className="field-hint invoice-source">{instructionsSource}</span>}
                </dd>
              </div>
            ) : (
              <div className="field"><dt>How to pay</dt><dd className="invoice-callout">No payment instructions — add a default in the issuer’s Branding &amp; documents, or this property’s own in Billing settings.</dd></div>
            )}
            <div className="field"><dt>Amount due — this invoice</dt><dd>{formatMoney(Number(snap.balance.this_invoice))}</dd></div>
            {snap.prior_unpaid.length > 0 && (
              <>
                <div className="field">
                  <dt>Earlier unpaid — already billed, not charged again</dt>
                  <dd>
                    {snap.prior_unpaid.map((p) => (
                      <span key={p.number} className="invoice-recipient">
                        {p.number} ({periodLabel(p.period_start)}): {formatMoney(Number(p.outstanding))} remaining
                        {p.source === 'continued_tenancy' && <span className="field-hint"> · earlier tenancy {p.tenancy_label} (linked on Tenancy &amp; billing)</span>}
                      </span>
                    ))}
                  </dd>
                </div>
                <div className="field">
                  <dt>{snap.prior_unpaid.some((p) => p.source === 'continued_tenancy') ? 'Total outstanding — this tenancy and the one it continues' : 'Total outstanding for this tenancy'}</dt>
                  <dd>{formatMoney(Number(snap.balance.total_outstanding))}</dd>
                </div>
              </>
            )}
          </dl>
          {snap.balance_review.length > 0 && (
            <div className="invoice-callout" role="note">
              <strong>Earlier balances not included — review who owes them:</strong>
              <ul>
                {snap.balance_review.map((r) => (
                  <li key={r.number}>{r.number} ({periodLabel(r.period_start)}, {r.tenancy_label}): {formatMoney(Number(r.outstanding))} — {r.reason}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {confirm === 'issue' && (
        <div className="invoice-confirm" role="alertdialog" aria-label="Confirm issue">
          <p>
            Issuing assigns {issuer?.display_name || issuer?.name}’s next invoice number ({nextNumber}) and stores the PDF exactly as approved.
            It can’t be edited afterwards — only revised or cancelled. <strong>Nothing is sent and no payment is recorded.</strong>
          </p>
          <div className="invoice-form-actions">
            <button type="button" className="invoice-compact-button invoice-compact-button--primary" disabled={workflow.busy} onClick={() => { setConfirm(null); workflow.issue(invoice) }}>Issue invoice</button>
            <button type="button" className="invoice-compact-button" onClick={() => setConfirm(null)}>Cancel</button>
          </div>
        </div>
      )}
      {confirm === 'reject' && (
        <div className="invoice-confirm" role="alertdialog" aria-label="Confirm reject">
          <label htmlFor="inv-reject-reason">Reason (optional)</label>
          <input id="inv-reject-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="invoice-form-actions">
            <button type="button" className="invoice-compact-button" disabled={workflow.busy} onClick={() => { setConfirm(null); workflow.reject(invoice, reason.trim() || null) }}>Reject draft</button>
            <button type="button" className="invoice-compact-button" onClick={() => setConfirm(null)}>Keep it</button>
          </div>
        </div>
      )}

      {doc?.render ? <InvoicePdfPreview model={doc.render} /> : <p className="empty-state">{doc?.problem ?? 'Preparing preview…'}</p>}
    </div>
  )

  return (
    <EditableSection
      key={`${invoice.id}-${invoice.version}`}
      title={`${tenancy ? `${tenancy.property?.address} — ${tenancy.unit?.unit_label}` : 'Invoice'} · ${periodLabel(invoice.period_start)}`}
      defaultOpen
      secondaryActions={actions}
      onEditStart={workflow.refreshOptions}
      view={view}
      edit={(exit) => (
        <InvoiceEditForm
          invoice={invoice}
          issuers={issuers}
          busy={workflow.busy}
          onCancel={exit}
          onSave={async (patch) => {
            if (Object.keys(patch).length === 0) return exit()
            await workflow.saveEdit(invoice, patch)
            exit()
          }}
        />
      )}
    />
  )
}
