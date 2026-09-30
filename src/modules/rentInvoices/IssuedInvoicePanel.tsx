import { useState } from 'react'
import { CollapsibleSection } from '../../shared/CollapsibleSection'
import { formatMoney, periodLabel } from './invoiceDocument'
import { InvoicePdfPreview } from './InvoicePdfPreview'
import { STATE_LABEL } from './invoiceWorkflowLogic'
import type { RentInvoiceRow } from './rentInvoiceTypes'
import type { InvoiceWorkflow } from './useInvoiceWorkflow'

interface IssuedInvoicePanelProps {
  invoice: RentInvoiceRow
  workflow: InvoiceWorkflow
}

// An issued (or superseded/cancelled) invoice: read-only, rendered from its
// stored snapshot, with the stored PDF. Changes happen only by an explicit
// revision or cancellation — never by editing.
export function IssuedInvoicePanel({ invoice, workflow }: IssuedInvoicePanelProps) {
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')
  const [hasStoredPdf, setHasStoredPdf] = useState<boolean | null>(null)
  const doc = workflow.selectedDoc?.invoiceId === invoice.id ? workflow.selectedDoc : null
  const snap = invoice.issued_snapshot
  const live = invoice.state === 'issued'
  const issuerName = snap?.issuer ? snap.issuer.display_name?.trim() || snap.issuer.legal_name : ''

  const actions = live ? (
    <span className="invoice-decision-actions">
      <button type="button" className="invoice-compact-button" disabled={workflow.busy} onClick={() => workflow.revise(invoice.id, invoice.version)}>Revise</button>
      <button type="button" className="invoice-compact-button" disabled={workflow.busy} onClick={() => setCancelling(true)}>Cancel…</button>
    </span>
  ) : undefined

  return (
    <CollapsibleSection title={`${invoice.number} · ${snap?.rental.property_address ?? ''} — ${snap?.rental.unit_label ?? ''} · ${periodLabel(invoice.period_start)}`} defaultOpen headerActions={actions}>
      <dl className="field-grid invoice-review-facts">
        <div className="field"><dt>Status</dt><dd>{STATE_LABEL[invoice.state]}</dd></div>
        <div className="field"><dt>Amount</dt><dd>{formatMoney(Number(invoice.amount_due))}</dd></div>
        <div className="field"><dt>Due date</dt><dd>{invoice.due_date}</dd></div>
        {issuerName && <div className="field"><dt>Issued by</dt><dd>{issuerName}</dd></div>}
      </dl>
      {cancelling && (
        <div className="invoice-confirm" role="alertdialog" aria-label="Confirm cancel">
          <p>Cancelling keeps {invoice.number} and its PDF on record; the number is never reused. Nothing is sent.</p>
          <label htmlFor="inv-cancel-reason">Reason<span className="required-marker">*</span></label>
          <input id="inv-cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="invoice-form-actions">
            <button type="button" className="invoice-compact-button" disabled={workflow.busy || !reason.trim()} onClick={() => { setCancelling(false); workflow.cancel(invoice.id, invoice.version, reason.trim()) }}>Cancel invoice</button>
            <button type="button" className="invoice-compact-button" onClick={() => setCancelling(false)}>Keep it</button>
          </div>
        </div>
      )}
      {doc?.render ? (
        <InvoicePdfPreview key={workflow.pdfNonce} model={doc.render} issuedInvoiceId={invoice.id} onStoredChecked={setHasStoredPdf} />
      ) : (
        <p className="field-hint">{doc?.problem ?? 'Preparing PDF…'}</p>
      )}
      {hasStoredPdf === false && (
        <p className="invoice-callout" role="status">
          This issued invoice has no stored PDF yet. Storing it doesn’t change the number or anything on the invoice.{' '}
          <button type="button" className="invoice-compact-button" disabled={workflow.busy} onClick={() => workflow.storePdf(invoice)}>
            Store PDF
          </button>
        </p>
      )}
    </CollapsibleSection>
  )
}
