import { useState } from 'react'
import { EditableSection } from '../../shared/EditableSection'
import { buildInvoiceDocument } from './invoiceDocument'
import { formatMoney } from './invoicePdf'
import { InvoiceEditForm } from './InvoiceEditForm'
import { InvoicePdfPreview } from './InvoicePdfPreview'
import { draftContextFrom, STATE_LABEL } from './invoiceWorkflowLogic'
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
// decision actions beside it. The PDF preview is rendered from exactly
// what would be issued.
export function InvoiceReviewPanel({ invoice, tenancy, issuers, workflow }: InvoiceReviewPanelProps) {
  const [confirm, setConfirm] = useState<'issue' | 'reject' | null>(null)
  const [reason, setReason] = useState('')
  const issuer = issuers.find((i) => i.id === invoice.billing_entity_id)
  const context = draftContextFrom(issuer, tenancy?.property?.address ?? '', tenancy?.unit?.unit_label ?? '')
  const model = context ? buildInvoiceDocument(invoice, context) : null
  const approvalValid = invoice.state === 'approved' && invoice.approved_material_version === invoice.material_version
  const issueBlocker = !issuer ? 'Choose the issuing entity (Edit).' : !issuer.invoice_code ? `${issuer.display_name || issuer.name} has no invoice code yet — add one on its entity profile (Invoicing).` : null
  const nextNumber = issuer?.invoice_code ? `${issuer.invoice_code}-INV-…` : null

  const actions = (
    <span className="invoice-decision-actions">
      {invoice.state === 'draft' && (
        <button type="button" className="invoice-compact-button invoice-compact-button--primary" disabled={workflow.busy} onClick={() => workflow.approve(invoice)}>Approve</button>
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
        <div className="field"><dt>Billing month</dt><dd>{model?.periodLabel}</dd></div>
        <div className="field"><dt>Due date</dt><dd>{invoice.due_date}</dd></div>
        <div className="field"><dt>Amount</dt><dd>{formatMoney(Number(invoice.amount_due))}</dd></div>
        {invoice.recipient_name && <div className="field"><dt>Bill to</dt><dd>{invoice.recipient_name}</dd></div>}
        {invoice.recipient_email && <div className="field"><dt>Recipient email</dt><dd>{invoice.recipient_email}</dd></div>}
        <div className="field"><dt>Issuing entity</dt><dd>{issuer ? issuer.display_name || issuer.name : 'Not chosen'}</dd></div>
        {invoice.internal_note && <div className="field"><dt>Internal note (never sent)</dt><dd>{invoice.internal_note}</dd></div>}
        <div className="field"><dt>Created by</dt><dd>{invoice.created_via === 'assistant' ? 'Rent & Payments Assistant' : 'You'}</dd></div>
      </dl>
      {invoice.state === 'approved' && issueBlocker && <p className="invoice-callout">{issueBlocker}</p>}

      {confirm === 'issue' && (
        <div className="invoice-confirm" role="alertdialog" aria-label="Confirm issue">
          <p>
            Issuing assigns {issuer?.display_name || issuer?.name}’s next invoice number ({nextNumber}) and stores the PDF permanently.
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

      {model ? <InvoicePdfPreview model={model} /> : <p className="empty-state">Choose the issuing entity to preview the PDF.</p>}
    </div>
  )

  return (
    <EditableSection
      key={`${invoice.id}-${invoice.version}`}
      title={`${tenancy ? `${tenancy.property?.address} — ${tenancy.unit?.unit_label}` : 'Invoice'} · ${model?.periodLabel ?? invoice.period_start}`}
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
