import { useState } from 'react'
import type { EntityProfileInput, Llc } from './llcsQueries'

interface EntityIdentityFormProps {
  entity: Llc
  saving: boolean
  onSave: (input: EntityProfileInput) => void
  onCancel: () => void
}

const LEGAL_STRUCTURE_OPTIONS: { value: NonNullable<Llc['legal_structure']>; label: string }[] = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'llc', label: 'LLC' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'trust', label: 'Trust' },
  { value: 'other', label: 'Other' },
]

// Presentational only — Identity edit fields for the entity profile,
// distinct from LlcForm.tsx (the Settings "Organization types" add/edit
// form, unchanged by this batch). Owner kind is not editable here once
// set to a real value on a NEW record's creation; an existing record
// whose kind is still unconfirmed (null) can be confirmed here, which is
// the one case this form allows setting it.
export function EntityIdentityForm({ entity, saving, onSave, onCancel }: EntityIdentityFormProps) {
  const [values, setValues] = useState<EntityProfileInput>({
    owner_kind: entity.owner_kind,
    display_name: entity.display_name,
    legal_structure: entity.legal_structure,
    mailing_address: entity.mailing_address,
    mailing_city: entity.mailing_city,
    mailing_state: entity.mailing_state,
    mailing_zip: entity.mailing_zip,
    notes: entity.notes,
  })

  const field = (key: keyof EntityProfileInput) => ({
    value: (values[key] as string | null) ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((prev) => ({ ...prev, [key]: e.target.value || null })),
  })

  return (
    <div className="field-column">
      {entity.owner_kind === null && (
        <div>
          <label htmlFor="entity_owner_kind">
            Owner / entity kind <span className="required-marker">*</span>
          </label>
          <select
            id="entity_owner_kind"
            value={values.owner_kind ?? ''}
            onChange={(e) => setValues((prev) => ({ ...prev, owner_kind: (e.target.value || null) as Llc['owner_kind'] }))}
          >
            <option value="">Not yet confirmed</option>
            <option value="individual">Individual</option>
            <option value="entity">Legal entity</option>
          </select>
        </div>
      )}

      <div>
        <label htmlFor="entity_display_name">Display name</label>
        <input id="entity_display_name" placeholder="Falls back to legal name" {...field('display_name')} />
      </div>

      <div>
        <label htmlFor="entity_legal_structure">Legal structure</label>
        <select
          id="entity_legal_structure"
          value={values.legal_structure ?? ''}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, legal_structure: (e.target.value || null) as Llc['legal_structure'] }))
          }
        >
          <option value="">Not recorded</option>
          {LEGAL_STRUCTURE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="entity_mailing_address">Mailing address</label>
        <input id="entity_mailing_address" {...field('mailing_address')} />
      </div>
      <div>
        <label htmlFor="entity_mailing_city">City</label>
        <input id="entity_mailing_city" {...field('mailing_city')} />
      </div>
      <div>
        <label htmlFor="entity_mailing_state">State</label>
        <input id="entity_mailing_state" {...field('mailing_state')} />
      </div>
      <div>
        <label htmlFor="entity_mailing_zip">ZIP</label>
        <input id="entity_mailing_zip" {...field('mailing_zip')} />
      </div>
      <div>
        <label htmlFor="entity_notes">Notes</label>
        <textarea id="entity_notes" {...field('notes')} />
      </div>

      <button type="button" disabled={saving} onClick={() => onSave(values)}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </div>
  )
}
