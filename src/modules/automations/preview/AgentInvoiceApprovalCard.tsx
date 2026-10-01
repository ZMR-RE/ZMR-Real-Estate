import { useState } from 'react'
import { formatMoney } from './agentFormat'
import { baseOf, documentFilename, formatDocNumber, revisionNumber } from './agentNumbering'
import { invoiceIssueBlocker, type InvoiceEdit } from './agentRecordEdits'
import { DOC_STATE_LABEL, entityName, invoiceName } from './agentRecordLabels'
import type { InvoiceRecord, RecordStore, TenantAssignment } from './agentTypes'

interface AgentInvoiceApprovalCardProps {
  invoice: InvoiceRecord
  assignment: TenantAssignment | undefined
  store: RecordStore
  onEdit: (edit: InvoiceEdit) => void
  onDecide: (decision: 'approve' | 'reject') => void
  onIssue: () => void
}

// Fictional attachment the preview lets the owner add or remove.
const DEMO_ATTACHMENT = { id: 'demo-lease-summary', label: 'Lease summary (PDF)' }

type Form = { amount: string; dueDate: string; issuer: string; recipientName: string; recipientEmail: string; visibleNote: string; attachLease: boolean; internalNote: string }

function formFrom(inv: InvoiceRecord): Form {
  return {
    amount: String(inv.amountDue),
    dueDate: inv.dueDate ?? '',
    issuer: inv.issuerEntityId ?? '',
    recipientName: inv.recipientName,
    recipientEmail: inv.recipientEmail ?? '',
    visibleNote: inv.visibleNote,
    attachLease: inv.attachmentIds.includes(DEMO_ATTACHMENT.id),
    internalNote: inv.internalNote,
  }
}

// One draft/approved invoice RECORD (the same row Rent ops lists). Editing
// here edits that record. Any change to what the tenant receives clears an
// existing approval; only the strictly internal note is exempt.
export function AgentInvoiceApprovalCard({ invoice: inv, assignment, store, onEdit, onDecide, onIssue }: AgentInvoiceApprovalCardProps) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Form>(() => formFrom(inv))
  const blocker = invoiceIssueBlocker(store, inv)
  const issuer = store.entities.find((e) => e.id === inv.issuerEntityId)
  const original = inv.revisionOf ? store.invoices.find((i) => i.id === inv.revisionOf) : undefined
  const previewNumber = original?.number
    ? revisionNumber(baseOf(original.number), inv.revision)
    : issuer?.shortCode
      ? formatDocNumber(issuer, 'invoice', issuer.nextInvoiceSeq)
      : null
  const f = (key: keyof Form) => `${key}-${inv.id}`

  const save = () => {
    const amount = Number(form.amount)
    onEdit({
      amountDue: Number.isFinite(amount) && amount > 0 ? amount : inv.amountDue,
      dueDate: form.dueDate || null,
      issuerEntityId: form.issuer || null,
      recipientName: form.recipientName.trim() || inv.recipientName,
      recipientEmail: form.recipientEmail.trim() || null,
      visibleNote: form.visibleNote,
      attachmentIds: form.attachLease ? [DEMO_ATTACHMENT.id] : [],
      internalNote: form.internalNote,
    })
    setEditing(false)
  }

  return (
    <li className="agents-approval agents-row--review">
      <div className="agents-approval-head">
        <span className="agents-assignment-main">
          <span className="agents-assignment-name">Invoice · {assignment?.tenantName} · {inv.periodLabel}</span>
          <span className="agents-row-meta">
            {inv.revision > 1 ? `${invoiceName(inv)} · ` : ''}{DOC_STATE_LABEL[inv.state]} · issuer {entityName(store, inv.issuerEntityId) ?? 'not chosen'}
          </span>
        </span>
        <span className="agents-assignment-rent">{formatMoney(inv.amountDue)}</span>
      </div>

      {inv.editConflict && <p className="agents-notice-flag">{inv.editConflict}</p>}
      {inv.approvalNote && <p className="agents-notice-flag">{inv.approvalNote}</p>}

      {editing ? (
        <div className="agents-edit agents-invoice-form">
          <label htmlFor={f('amount')}>Amount<span className="required-marker">*</span></label>
          <input id={f('amount')} inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <label htmlFor={f('dueDate')}>Due date</label>
          <input id={f('dueDate')} type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          <label htmlFor={f('issuer')}>Issuer</label>
          <select id={f('issuer')} value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} disabled={inv.revisionOf !== null}>
            <option value="">Not chosen</option>
            {store.entities.map((en) => <option key={en.id} value={en.id}>{en.legalName}</option>)}
          </select>
          {inv.revisionOf && <p className="field-hint">A revision keeps its original issuer and number.</p>}
          <label htmlFor={f('recipientName')}>Bill to</label>
          <input id={f('recipientName')} value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} />
          <label htmlFor={f('recipientEmail')}>Recipient email</label>
          <input id={f('recipientEmail')} type="email" value={form.recipientEmail} onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })} />
          <label htmlFor={f('visibleNote')}>Note shown on the invoice</label>
          <input id={f('visibleNote')} value={form.visibleNote} onChange={(e) => setForm({ ...form, visibleNote: e.target.value })} />
          <label className="agents-inline-check">
            <input type="checkbox" checked={form.attachLease} onChange={(e) => setForm({ ...form, attachLease: e.target.checked })} />
            Attach {DEMO_ATTACHMENT.label}
          </label>
          <label htmlFor={f('internalNote')}>Internal note</label>
          <input id={f('internalNote')} value={form.internalNote} onChange={(e) => setForm({ ...form, internalNote: e.target.value })} />
          <p className="field-hint">
            Changing anything the tenant would see or receive — amount, dates, issuer, recipient, visible note or attachments — clears an existing approval.
            Only the internal note, which never appears on the PDF or email, keeps it.
          </p>
          <div className="agents-edit-actions">
            <button type="submit" onClick={save}>Save</button>
            <button type="button" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <dl className="agents-dl agents-draft-detail">
          <div><dt>Bill to</dt><dd>{inv.recipientName}{inv.recipientEmail ? ` · ${inv.recipientEmail}` : ''}</dd></div>
          {inv.dueDate && <div><dt>Due date</dt><dd>{inv.dueDate}</dd></div>}
          {inv.visibleNote && <div><dt>Note shown on invoice</dt><dd>{inv.visibleNote}</dd></div>}
          {inv.attachmentIds.length > 0 && <div><dt>Attachments</dt><dd>{DEMO_ATTACHMENT.label}</dd></div>}
          {inv.internalNote && <div><dt>Internal note (never sent)</dt><dd>{inv.internalNote}</dd></div>}
          {previewNumber && (
            <div>
              <dt>Number and file if issued</dt>
              <dd className="agents-file">{previewNumber} · {documentFilename(previewNumber, inv.periodKey, assignment?.unitLabel ?? 'Unit')}</dd>
            </div>
          )}
        </dl>
      )}

      {!editing && (
        <div className="agents-approval-actions">
          {blocker && inv.state === 'approved' && <span className="agents-row-meta">{blocker}</span>}
          <button type="button" className="agents-compact-button" onClick={() => { setForm(formFrom(inv)); setEditing(true) }}>Edit</button>
          <button type="button" className="agents-compact-button" onClick={() => onDecide('reject')}>Reject</button>
          {inv.state === 'draft' ? (
            <button type="button" className="agents-compact-button agents-compact-button--primary" onClick={() => onDecide('approve')}>Approve</button>
          ) : (
            <button type="button" className="agents-compact-button agents-compact-button--primary" disabled={blocker !== null} onClick={onIssue}>Issue (preview)</button>
          )}
        </div>
      )}
    </li>
  )
}
