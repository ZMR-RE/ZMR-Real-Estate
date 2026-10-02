import { useRef, useState } from 'react'
import { issuerOptionLabel, issuersNamed } from './billingSettingsLogic'
import { createPersonIssuer, type EntityOption } from './billingSettingsQueries'

interface AddPersonIssuerProps {
  accountId: string
  existing: EntityOption[]
  // The chosen issuer: a newly added person, or an existing record the owner
  // picked instead. Nothing else changes until the box is saved.
  onChosen: (issuer: EntityOption, isNew: boolean) => void
}

// Billing settings › Invoice issuer › + Add person. Adds a person as an owner
// record (kind Individual) so they can issue invoices — without recording any
// ownership of this or any other property. Same-name records are offered,
// never forced: two different people can share a name.
export function AddPersonIssuer({ accountId, existing, onChosen }: AddPersonIssuerProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [matches, setMatches] = useState<EntityOption[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // One save at a time: a second Enter or click while a save is running is
  // ignored (state alone updates too late to stop a fast repeat).
  const inFlight = useRef(false)

  const close = () => {
    setOpen(false)
    setName('')
    setMatches(null)
    setError(null)
  }

  const create = async (confirmedNew: boolean) => {
    if (inFlight.current) return
    const clean = name.trim().replace(/\s+/g, ' ')
    if (!clean) return setError('Enter the person’s full name.')
    const same = issuersNamed(existing, clean)
    if (!confirmedNew && same.length > 0) return setMatches(same)
    inFlight.current = true
    setSaving(true)
    const { data, error: e } = await createPersonIssuer(accountId, clean)
    setSaving(false)
    inFlight.current = false
    if (e || !data) return setError(e?.message ?? 'Could not add the person.')
    close()
    onChosen(data, true)
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}>
        + Add person
      </button>
    )
  }

  return (
    <div className="billing-add-person">
      <label htmlFor={`add-person-${accountId}`}>
        Person’s full name<span className="required-marker">*</span>
      </label>
      <input
        id={`add-person-${accountId}`}
        value={name}
        disabled={saving}
        onChange={(e) => { setName(e.target.value); setMatches(null) }}
        // Enter adds the person; it must not submit the surrounding Billing settings form.
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); create(false) } }}
      />
      <p className="field-hint">Saved right away as a person who can issue invoices — not as an owner. They stay even if you cancel Billing settings.</p>
      {matches && (
        <div role="status">
          <p>
            <strong>“{name.trim()}” is already in your records.</strong> Use that record, or add a different person with the same name.
          </p>
          <div className="billing-actions">
            {matches.map((m) => (
              <button key={m.id} type="button" onClick={() => { close(); onChosen(m, false) }}>
                Use existing: {issuerOptionLabel(m)}
              </button>
            ))}
            <button type="button" disabled={saving} onClick={() => create(true)}>
              Add a different person with this name
            </button>
          </div>
        </div>
      )}
      {error && <p className="billing-callout billing-callout--error" role="alert">{error}</p>}
      {!matches && (
        <div className="billing-actions">
          <button type="button" disabled={saving} onClick={() => create(false)}>{saving ? 'Saving…' : 'Save person'}</button>
          <button type="button" onClick={close}>Cancel</button>
        </div>
      )}
    </div>
  )
}
