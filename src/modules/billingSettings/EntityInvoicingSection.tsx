import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EditableSection } from '../../shared/EditableSection'
import './billingSettings.css'
import { normalizeInvoiceCode, previewInvoiceNumber, validateEntityInvoicing } from './billingSettingsLogic'
import { getEntityInvoicing, getInvoiceSequence, setInvoiceSequenceStart, updateEntityInvoicing, type EntityInvoicingRow } from './billingSettingsQueries'

interface EntityInvoicingSectionProps {
  entityId: string
}

// Entity profile → Invoicing (RP2): the entity's invoice code and its own
// continuous numbering. Name and address come from the Identity box; logo,
// colours, reply-to/contact details and default payment instructions from
// Branding & documents (one home for each, never duplicated here).
export function EntityInvoicingSection({ entityId }: EntityInvoicingSectionProps) {
  const [entity, setEntity] = useState<EntityInvoicingRow | null>(null)
  const [seq, setSeq] = useState<{ next_value: number; first_issued_at: string | null } | null>(null)
  const [form, setForm] = useState({ code: '', start: '' })
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const [e, s] = await Promise.all([getEntityInvoicing(entityId), getInvoiceSequence(entityId)])
    if (e.error) return setError(e.error.message)
    setEntity(e.data)
    setSeq(s.data ?? null)
  }, [entityId])

  useEffect(() => {
    refresh()
  }, [refresh])

  if (!entity) return null
  const started = !!seq?.first_issued_at
  const next = seq?.next_value ?? 1
  const input = { invoice_code: normalizeInvoiceCode(form.code) || null }
  const errors = validateEntityInvoicing(input, form.start, !started)
  const preview = previewInvoiceNumber(entity.invoice_code, next)

  const view = (
    <>
      {!entity.invoice_code && <p className="billing-callout">No invoice code yet — invoices from this entity can be drafted but not issued.</p>}
      <dl className="field-grid">
        {entity.invoice_code && <div className="field"><dt>Invoice code</dt><dd>{entity.invoice_code}</dd></div>}
        {preview && <div className="field"><dt>Next invoice number</dt><dd>{preview}</dd></div>}
      </dl>
      <p className="field-hint">
        Logo, colours, contact details and default payment instructions: <Link to={`/settings?tab=entities&entity=${entityId}`}>Branding &amp; documents</Link>.
      </p>
    </>
  )

  const edit = (exit: () => void) => (
    <form
      className="billing-form"
      onSubmit={async (e) => {
        e.preventDefault()
        setTouched(true)
        if (errors.length > 0) return
        setSaving(true)
        let failure = (await updateEntityInvoicing(entityId, input)).error
        if (!failure && !started && form.start.trim() && Number(form.start) !== next) {
          failure = (await setInvoiceSequenceStart(entityId, Number(form.start))).error
        }
        setSaving(false)
        if (failure) return setError(failure.code === 'ZM347' ? 'This entity has already issued invoices, so its code can’t change.' : failure.message)
        setError(null)
        await refresh()
        exit()
      }}
    >
      <label htmlFor={`code-${entityId}`}>Invoice code</label>
      <input id={`code-${entityId}`} value={form.code} disabled={started} maxLength={8} onChange={(e) => setForm({ ...form, code: e.target.value })} />
      <p className="field-hint">
        {started ? 'Locked — this entity has issued invoices under this code.' : 'Up to 8 letters or digits, e.g. A or SRP. Numbers look like A-INV-000001; each entity has its own sequence.'}
      </p>
      {!started && (
        <>
          <label htmlFor={`start-${entityId}`}>First invoice number</label>
          <input id={`start-${entityId}`} inputMode="numeric" placeholder={String(next)} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
          <p className="field-hint">Only if you’re continuing existing numbering. Fixed once the first invoice is issued; numbers are never reused.</p>
        </>
      )}
      {touched && errors.length > 0 && <ul className="billing-errors" role="alert">{errors.map((er) => <li key={er}>{er}</li>)}</ul>}
      {error && <p className="billing-callout billing-callout--error" role="alert">{error}</p>}
      <div className="billing-actions">
        <button type="submit" disabled={saving}>Save</button>
        <button type="button" onClick={exit}>Cancel</button>
      </div>
    </form>
  )

  return (
    <EditableSection
      title="Invoicing"
      view={view}
      edit={edit}
      onEditStart={() => {
        setForm({ code: entity.invoice_code ?? '', start: '' })
        setTouched(false)
        setError(null)
        refresh()
      }}
    />
  )
}
