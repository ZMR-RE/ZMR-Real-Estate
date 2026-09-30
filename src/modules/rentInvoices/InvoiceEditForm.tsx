import { useState } from 'react'
import { buildPatch, editValuesFrom, patchIsMaterial, validateEdit, type InvoiceEditValues, type LineDraft } from './invoiceWorkflowLogic'
import type { InvoicePatch, IssuerRow } from './rentInvoicesQueries'
import type { RentInvoiceRow } from './rentInvoiceTypes'

interface InvoiceEditFormProps {
  invoice: RentInvoiceRow
  issuers: IssuerRow[]
  busy: boolean
  onSave: (patch: InvoicePatch) => void
  onCancel: () => void
}

const KIND_LABEL: Record<LineDraft['line_kind'], string> = { rent: 'Rent', prorated_rent: 'Partial-month rent', charge: 'Charge', credit: 'Credit' }

export function InvoiceEditForm({ invoice, issuers, busy, onSave, onCancel }: InvoiceEditFormProps) {
  const [v, setV] = useState<InvoiceEditValues>(() => editValuesFrom(invoice))
  const [touched, setTouched] = useState(false)
  const errors = validateEdit(v)
  const patch = buildPatch(invoice, v)
  const clearsApproval = invoice.state === 'approved' && patchIsMaterial(patch)
  const setLine = (i: number, change: Partial<LineDraft>) => setV({ ...v, lines: v.lines.map((l, j) => (j === i ? { ...l, ...change } : l)) })

  return (
    <form
      className="invoice-edit-form"
      onSubmit={(e) => {
        e.preventDefault()
        setTouched(true)
        if (errors.length === 0) onSave(patch)
      }}
    >
      <label htmlFor="inv-due">Due date<span className="required-marker">*</span></label>
      <input id="inv-due" type="date" value={v.dueDate} onChange={(e) => setV({ ...v, dueDate: e.target.value })} required />

      <label htmlFor="inv-issuer">Issuing entity</label>
      <select id="inv-issuer" value={v.issuerId} disabled={invoice.revision_of !== null} onChange={(e) => setV({ ...v, issuerId: e.target.value })}>
        <option value="">Not chosen</option>
        {issuers.map((i) => (
          <option key={i.id} value={i.id}>{i.display_name || i.name}{i.invoice_code ? ` (${i.invoice_code})` : ' — no invoice code yet'}</option>
        ))}
      </select>
      {invoice.revision_of && <p className="field-hint">A revision keeps its original issuer and number.</p>}

      <label htmlFor="inv-recipient">Bill to</label>
      <input id="inv-recipient" value={v.recipientName} onChange={(e) => setV({ ...v, recipientName: e.target.value })} />
      <label htmlFor="inv-email">Recipient email</label>
      <input id="inv-email" type="email" value={v.recipientEmail} onChange={(e) => setV({ ...v, recipientEmail: e.target.value })} />

      <fieldset className="invoice-lines-editor">
        <legend>Lines</legend>
        {v.lines.map((line, i) => (
          <div key={i} className="invoice-line-edit">
            <select aria-label={`Line ${i + 1} type`} value={line.line_kind} onChange={(e) => setLine(i, { line_kind: e.target.value as LineDraft['line_kind'] })}>
              {(Object.keys(KIND_LABEL) as LineDraft['line_kind'][]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
            <input aria-label={`Line ${i + 1} description`} value={line.description} onChange={(e) => setLine(i, { description: e.target.value })} />
            <input aria-label={`Line ${i + 1} amount`} inputMode="decimal" value={line.amount} onChange={(e) => setLine(i, { amount: e.target.value })} />
            <button type="button" className="invoice-compact-button" onClick={() => setV({ ...v, lines: v.lines.filter((_, j) => j !== i) })}>Remove</button>
          </div>
        ))}
        <div className="invoice-form-actions">
          <button type="button" className="invoice-compact-button" onClick={() => setV({ ...v, lines: [...v.lines, { line_kind: 'charge', description: '', amount: '' }] })}>Add charge</button>
          <button type="button" className="invoice-compact-button" onClick={() => setV({ ...v, lines: [...v.lines, { line_kind: 'credit', description: '', amount: '' }] })}>Add credit</button>
        </div>
        <p className="field-hint">Credits are entered as negative amounts.</p>
      </fieldset>

      <label htmlFor="inv-visible">Note shown on the invoice</label>
      <textarea id="inv-visible" value={v.visibleNote} onChange={(e) => setV({ ...v, visibleNote: e.target.value })} />
      <label htmlFor="inv-internal">Internal note</label>
      <textarea id="inv-internal" value={v.internalNote} onChange={(e) => setV({ ...v, internalNote: e.target.value })} />
      <p className="field-hint">Never printed, emailed or attached. It’s the only change that keeps an approval.</p>

      {clearsApproval && <p className="invoice-callout">Saving this change clears the approval — the invoice will need approving again.</p>}
      {touched && errors.length > 0 && (
        <ul className="invoice-errors" role="alert">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
      <div className="invoice-form-actions">
        <button type="submit" disabled={busy}>Save</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
