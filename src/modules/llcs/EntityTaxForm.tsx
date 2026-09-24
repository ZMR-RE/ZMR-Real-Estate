import { useState } from 'react'
import type { EntityProfileInput, Llc } from './llcsQueries'

interface EntityTaxFormProps {
  entity: Llc
  saving: boolean
  onSave: (input: EntityProfileInput) => void
  onCancel: () => void
}

// Presentational only. Selecting a membership or federal tax treatment
// value here never sets the other, or any tax-election field —
// legal_structure/membership/federal_tax_treatment/election records stay
// four independently-set facts, per the ownership specification's
// explicit separation requirement.
export function EntityTaxForm({ entity, saving, onSave, onCancel }: EntityTaxFormProps) {
  const [values, setValues] = useState<EntityProfileInput>({
    membership: entity.membership,
    federal_tax_treatment: entity.federal_tax_treatment,
    federal_tax_treatment_effective_date: entity.federal_tax_treatment_effective_date,
  })

  return (
    <div className="field-column">
      <div>
        <label htmlFor="entity_membership">LLC membership</label>
        <select
          id="entity_membership"
          value={values.membership ?? ''}
          onChange={(e) => setValues((prev) => ({ ...prev, membership: (e.target.value || null) as Llc['membership'] }))}
        >
          <option value="">Not recorded</option>
          <option value="unknown">Unknown</option>
          <option value="single_member">Single member</option>
          <option value="multiple_members">Multiple members</option>
        </select>
      </div>

      <div>
        <label htmlFor="entity_federal_tax_treatment">Federal tax treatment</label>
        <select
          id="entity_federal_tax_treatment"
          value={values.federal_tax_treatment ?? ''}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, federal_tax_treatment: (e.target.value || null) as Llc['federal_tax_treatment'] }))
          }
        >
          <option value="">Not recorded</option>
          <option value="unknown">Unknown</option>
          <option value="disregarded_entity">Disregarded entity</option>
          <option value="partnership">Partnership</option>
          <option value="s_corporation">S corporation</option>
          <option value="c_corporation">C corporation</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label htmlFor="entity_tax_effective_date">Treatment effective date</label>
        <input
          id="entity_tax_effective_date"
          type="date"
          value={values.federal_tax_treatment_effective_date ?? ''}
          onChange={(e) => setValues((prev) => ({ ...prev, federal_tax_treatment_effective_date: e.target.value || null }))}
        />
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
