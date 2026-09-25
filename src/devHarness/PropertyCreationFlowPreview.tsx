import { useState } from 'react'
import { US_STATES } from '../shared/usStates'

// Batch S / Package 1 — VISUAL PREVIEW ONLY, not wired into the
// application. Distinct from PropertyFormGroupedPreview.tsx (the
// single-page, post-create grouped EDIT form): this previews the
// separate four-step CREATION flow Batch B originally approved
// (Ownership → Property basics → Documents (optional) → Review).
// Editing an existing property never re-enters this wizard.
//
// Corrected this pass, per explicit review feedback on the prior
// version:
// - Real Back/Next/Cancel navigation at every step (the prior version
//   only had clickable step-number tabs at the top, which read as
//   arbitrary free jumping, not an actual wizard). The progress
//   indicator up top is now a plain, non-interactive display of
//   current/completed steps — Back/Next/the Review step's own "Edit"
//   links are the only way to move between steps, same as a real
//   multi-step form.
// - No Name field anywhere in this flow — address is the identifier at
//   creation; nothing here re-adds the redundant input. (An existing
//   property's own saved Name stays visible/editable elsewhere, in the
//   separate post-create Edit form preview, as an optional legacy
//   label — not here.)
// - Step 1's owner picker is a real structured selection from existing
//   fixture owners (a `<select>`, same shape as the real
//   SearchableSelect's own option list) plus an explicit "add a new
//   owner" action that reveals its own separate name field — typing in
//   the main picker itself is not possible, so nothing here could be
//   mistaken for "typing creates a verified owner."
// - The allocation-completeness hint no longer claims that leaving it
//   unchecked lets a later addition "bypass correction requirements" —
//   every ownership change, at any time, already requires an explicit
//   reason (the real `replace_property_ownership_interests` RPC); nothing
//   about this checkbox changes that.
// - No engineering/status prose rendered in the visible preview area —
//   one banner at the top says this is a non-saving preview, and that's
//   the only meta-commentary shown; everything else here is ordinary
//   product copy or fictional data.
// - Step 2 demonstrates an actual invalid state: clicking Next with
//   Address empty shows an inline validation message and does not
//   advance, matching real required-field enforcement.
const OWNER_OPTIONS = [
  { id: 'harness-llc-owner-a', name: 'ZMR-TEST-FIXTURE Owner A' },
  { id: 'harness-llc-owner-b', name: 'ZMR-TEST-FIXTURE Owner B' },
  { id: 'harness-llc-entity', name: 'ZMR-TEST-FIXTURE Holdings LLC' },
]

interface OwnerRow {
  ownerId: string
  newOwnerName: string
  percentage: string
}

const STEP_LABELS = ['Ownership', 'Property basics', 'Documents', 'Review']

export function PropertyCreationFlowPreview() {
  const [step, setStep] = useState(1)
  const [owners, setOwners] = useState<OwnerRow[]>([{ ownerId: 'harness-llc-owner-a', newOwnerName: '', percentage: '' }])
  const [allocationComplete, setAllocationComplete] = useState(false)
  const [basics, setBasics] = useState({ address: '', city: 'Practiceville', state: 'IL', zip: '60000', status: 'active' })
  const [addressTouched, setAddressTouched] = useState(false)
  const [stagedFiles, setStagedFiles] = useState<string[]>([])

  const addOwnerRow = () => setOwners((prev) => [...prev, { ownerId: 'harness-llc-owner-a', newOwnerName: '', percentage: '' }])
  const updateOwnerRow = (i: number, patch: Partial<OwnerRow>) =>
    setOwners((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)))
  const removeOwnerRow = (i: number) => setOwners((prev) => prev.filter((_, idx) => idx !== i))

  const ownerDisplayName = (o: OwnerRow) =>
    o.ownerId === 'new' ? o.newOwnerName || '(new owner not yet named)' : OWNER_OPTIONS.find((opt) => opt.id === o.ownerId)?.name ?? ''

  const addressValid = basics.address.trim().length > 0

  const goNext = () => {
    if (step === 2 && !addressValid) {
      setAddressTouched(true)
      return
    }
    setStep((s) => Math.min(4, s + 1))
  }
  const goBack = () => setStep((s) => Math.max(1, s - 1))
  const goToStep = (n: number) => setStep(n)

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="preview-banner">PREVIEW ONLY — nothing on this screen is saved. Every value is fictional.</div>

      <div className="preview-steps" aria-label={`Step ${step} of 4: ${STEP_LABELS[step - 1]}`}>
        {STEP_LABELS.map((label, i) => {
          const n = i + 1
          const cls = n === step ? 'preview-step preview-step--active' : n < step ? 'preview-step preview-step--done' : 'preview-step'
          return (
            <span key={label} className={cls}>
              {n}. {label}
            </span>
          )
        })}
      </div>

      {step === 1 && (
        <div className="property-field-group">
          <h3 className="property-field-group-title">Ownership</h3>
          <div className="field-column">
            {owners.map((owner, i) => (
              <div className="field-row" key={i}>
                <div className="field">
                  <label htmlFor={`owner-select-${i}`}>Owner</label>
                  <select
                    id={`owner-select-${i}`}
                    value={owner.ownerId}
                    onChange={(e) => updateOwnerRow(i, { ownerId: e.target.value })}
                  >
                    {OWNER_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                    <option value="new">+ Add a new owner…</option>
                  </select>
                  {owner.ownerId === 'new' && (
                    <input
                      style={{ marginTop: 'var(--space-2)' }}
                      placeholder="New owner's name"
                      value={owner.newOwnerName}
                      onChange={(e) => updateOwnerRow(i, { newOwnerName: e.target.value })}
                    />
                  )}
                </div>
                <div className="field">
                  <label htmlFor={`owner-pct-${i}`}>Percentage (optional)</label>
                  <input
                    id={`owner-pct-${i}`}
                    placeholder="Not yet known"
                    value={owner.percentage}
                    onChange={(e) => updateOwnerRow(i, { percentage: e.target.value })}
                  />
                </div>
                {owners.length > 1 && (
                  <button type="button" onClick={() => removeOwnerRow(i)} aria-label="Remove owner">
                    Remove
                  </button>
                )}
              </div>
            ))}
            <div className="field">
              <button type="button" onClick={addOwnerRow}>
                + Add another owner
              </button>
            </div>
            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 400 }}>
                <input type="checkbox" checked={allocationComplete} onChange={(e) => setAllocationComplete(e.target.checked)} />
                All current owners are entered — allocation is complete
              </label>
              <p className="field-hint">Leave unchecked if more owners still need to be added.</p>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="property-field-group">
          <h3 className="property-field-group-title">Property basics</h3>
          <div className="field-column">
            <div className="field">
              <label htmlFor="basics-address">
                Address<span className="required-marker">*</span>
              </label>
              <input
                id="basics-address"
                value={basics.address}
                onChange={(e) => setBasics((p) => ({ ...p, address: e.target.value }))}
                onBlur={() => setAddressTouched(true)}
              />
              {addressTouched && !addressValid && (
                <p className="field-hint" role="alert" style={{ color: 'var(--danger)' }}>
                  Address is required.
                </p>
              )}
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="basics-city">City</label>
                <input id="basics-city" value={basics.city} onChange={(e) => setBasics((p) => ({ ...p, city: e.target.value }))} />
              </div>
              <div className="field">
                <label htmlFor="basics-state">State</label>
                <select id="basics-state" value={basics.state} onChange={(e) => setBasics((p) => ({ ...p, state: e.target.value }))}>
                  {US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="basics-zip">Zip</label>
                <input id="basics-zip" value={basics.zip} onChange={(e) => setBasics((p) => ({ ...p, zip: e.target.value }))} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="basics-status">Status</label>
              <select id="basics-status" value={basics.status} onChange={(e) => setBasics((p) => ({ ...p, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="sold">Sold</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="property-field-group">
          <h3 className="property-field-group-title">Documents (optional)</h3>
          <div className="field-column">
            <div className="field">
              <label>Deed / acquisition documents</label>
              {stagedFiles.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 'var(--space-5)' }}>
                  {stagedFiles.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
              <button type="button" onClick={() => setStagedFiles(['ZMR-TEST-PRACTICE-deed-preview.pdf'])} disabled={stagedFiles.length > 0}>
                Choose a file
              </button>
              <p className="field-hint">Nothing uploads until Save on the Review step.</p>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="property-field-group">
          <h3 className="property-field-group-title">Review</h3>
          <div className="field-column">
            <dl className="field-grid">
              <div className="field">
                <dt>
                  Owners <button type="button" onClick={() => goToStep(1)}>Edit</button>
                </dt>
                <dd>{owners.map(ownerDisplayName).filter(Boolean).join('; ') || '—'}</dd>
              </div>
              <div className="field">
                <dt>Allocation</dt>
                <dd>{allocationComplete ? 'Complete' : 'Incomplete — more owners may still be added'}</dd>
              </div>
              <div className="field">
                <dt>
                  Address <button type="button" onClick={() => goToStep(2)}>Edit</button>
                </dt>
                <dd>
                  {basics.address}, {basics.city}, {basics.state} {basics.zip}
                </dd>
              </div>
              <div className="field">
                <dt>Status</dt>
                <dd>{basics.status}</dd>
              </div>
              {stagedFiles.length > 0 && (
                <div className="field">
                  <dt>
                    Documents <button type="button" onClick={() => goToStep(3)}>Edit</button>
                  </dt>
                  <dd>{stagedFiles.join(', ')}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
        <button type="button" disabled>
          Cancel (preview only)
        </button>
        <div style={{ flex: 1 }} />
        {step > 1 && (
          <button type="button" onClick={goBack}>
            Back
          </button>
        )}
        {step < 4 && (
          <button type="button" onClick={goNext}>
            {step === 3 && stagedFiles.length === 0 ? 'Skip' : 'Next'}
          </button>
        )}
        {step === 4 && (
          <button type="button" disabled aria-disabled="true">
            Save (preview only — disabled, does not save)
          </button>
        )}
      </div>
    </div>
  )
}
