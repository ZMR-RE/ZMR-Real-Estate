import { US_STATES } from '../../shared/usStates'

interface Basics {
  address: string
  city: string
  state: string
  zip: string
  status: 'active' | 'inactive' | 'sold'
}

interface PropertyCreationBasicsStepProps {
  basics: Basics
  addressTouched: boolean
  addressValid: boolean
  onFieldChange: (field: keyof Basics, value: string) => void
  onAddressBlur: () => void
}

// Package 1 — Basics step. Unchanged sequence from the approved
// screen-organization review: address full-width, then city/state/zip
// with city wider than the short fields, status below. No Name field —
// address is the real identifier (shared/propertyLabel.ts); a name can
// still be added later via the existing property's own Edit form.
export function PropertyCreationBasicsStep({ basics, addressTouched, addressValid, onFieldChange, onAddressBlur }: PropertyCreationBasicsStepProps) {
  return (
    <div className="property-field-group">
      <h3 className="property-field-group-title">Property basics</h3>
      <div className="field-column">
        <div className="field">
          <label htmlFor="wizard-address">
            Address<span className="required-marker">*</span>
          </label>
          <input id="wizard-address" value={basics.address} onChange={(e) => onFieldChange('address', e.target.value)} onBlur={onAddressBlur} />
          {addressTouched && !addressValid && (
            <p className="field-hint" role="alert" style={{ color: 'var(--danger)' }}>
              Address is required.
            </p>
          )}
        </div>
        <div className="field-row">
          <div className="field" style={{ flex: 2 }}>
            <label htmlFor="wizard-city">City</label>
            <input id="wizard-city" value={basics.city} onChange={(e) => onFieldChange('city', e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="wizard-state">State</label>
            <select id="wizard-state" value={basics.state} onChange={(e) => onFieldChange('state', e.target.value)}>
              <option value="">Select…</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="wizard-zip">Zip</label>
            <input id="wizard-zip" value={basics.zip} onChange={(e) => onFieldChange('zip', e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="wizard-status">Status</label>
          <select id="wizard-status" value={basics.status} onChange={(e) => onFieldChange('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="sold">Sold</option>
          </select>
        </div>
      </div>
    </div>
  )
}
