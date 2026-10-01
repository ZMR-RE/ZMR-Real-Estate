import { useState } from 'react'
import { money } from './chargeRulesLogic'
import type { ChargeRuleRow, StatementDocumentOption } from './chargeRulesQueries'

interface StatementFormProps {
  rule: ChargeRuleRow
  documents: StatementDocumentOption[]
  saving: boolean
  onSave: (month: string, amount: number, documentId: string | null) => Promise<boolean>
  onCancel: () => void
}

const docName = (d: StatementDocumentOption) => d.label?.trim() || d.storage_path.split('/').pop() || 'Document'

// Enter one month's bill for a variable (statement-based) charge, linked to
// the statement document already stored on the property.
export function StatementForm({ rule, documents, saving, onSave, onCancel }: StatementFormProps) {
  const [month, setMonth] = useState('')
  const [amount, setAmount] = useState('')
  const [documentId, setDocumentId] = useState('')
  const [touched, setTouched] = useState(false)
  const n = Number(amount)
  const errors = [
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) && 'Choose the month the bill covers.',
    !(amount.trim() !== '' && Number.isFinite(n) && n > 0) && 'Enter the statement total.',
  ].filter(Boolean) as string[]

  return (
    <form
      className="billing-form charge-rule-form"
      onSubmit={async (e) => {
        e.preventDefault()
        setTouched(true)
        if (errors.length === 0 && (await onSave(month, Math.round(n * 100) / 100, documentId || null))) onCancel()
      }}
    >
      <p className="property-field-group-title">Statement for {rule.description}</p>
      <label htmlFor={`st-month-${rule.id}`}>Service month<span className="required-marker">*</span></label>
      <input id={`st-month-${rule.id}`} type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      <label htmlFor={`st-amt-${rule.id}`}>Statement total<span className="required-marker">*</span></label>
      <input id={`st-amt-${rule.id}`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      {amount.trim() !== '' && Number.isFinite(n) && n > 0 && (
        <p className="field-hint">Tenant’s {Number(rule.share_percent)}%: {money(Math.round(n * Number(rule.share_percent)) / 100)} on the next invoice drafted.</p>
      )}
      <label htmlFor={`st-doc-${rule.id}`}>Statement document</label>
      <select id={`st-doc-${rule.id}`} value={documentId} onChange={(e) => setDocumentId(e.target.value)}>
        <option value="">None linked</option>
        {documents.map((d) => <option key={d.id} value={d.id}>{docName(d)} ({d.uploaded_at.slice(0, 10)})</option>)}
      </select>
      <p className="field-hint">Upload the bill to the property’s Documents first, then link it here.</p>
      {touched && errors.length > 0 && <ul className="billing-errors" role="alert">{errors.map((er) => <li key={er}>{er}</li>)}</ul>}
      <div className="billing-actions">
        <button type="submit" disabled={saving}>Save</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
