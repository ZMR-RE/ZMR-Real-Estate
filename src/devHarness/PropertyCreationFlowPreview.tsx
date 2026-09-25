import { useState } from 'react'
import { US_STATES } from '../shared/usStates'

// Batch S / Package 1 — VISUAL PREVIEW ONLY, not wired into the
// application. Distinct from PropertyFormGroupedPreview.tsx (the
// single-page, post-create grouped EDIT form): this previews the
// separate four-step CREATION flow (Ownership → Property basics →
// Documents (optional) → Review). Editing an existing property never
// re-enters this wizard.
//
// Revised per the Sept 25 2026 screen-organization review:
// - Each owner is its own bordered block (not just a bare row), with
//   the owner picker given more width than the short percentage field,
//   and Remove kept inside the same block. "+ Add another owner" sits
//   directly under the roster. The inline "new owner" field now has a
//   real <label>, not just a placeholder. A plain, informational
//   "entered so far" summary (count of owners with a percentage, and
//   their sum) sits between the roster and the allocation-complete
//   checkbox — distinct from that checkbox, never inferred into it.
//   Default state now shows two owners, one with a deliberately long
//   name, one with no percentage yet, so multi-owner/long-value
//   wrapping is visible without extra clicks.
// - Property basics keeps address full-width, then city/state/zip with
//   city given more width than the short state/zip fields, status
//   below — already-approved sequence, unchanged.
// - Documents now shows each staged file as its own row: name, size,
//   a "Ready to upload" status, and its own Remove action.
// - Review is rebuilt into two titled sections side by side (Property
//   basics, Ownership), each with its own top-right Edit link, plus
//   Documents shown full-width below both — not one flat field list.
//   Owner rows in Review are aligned (name, then percentage or an
//   explicit "not yet entered"), never a comma-joined string.
const OWNER_OPTIONS = [
  { id: 'harness-llc-owner-a', name: 'ZMR-TEST-FIXTURE Owner A' },
  { id: 'harness-llc-owner-b', name: 'ZMR-TEST-FIXTURE Owner B' },
  { id: 'harness-llc-entity', name: 'ZMR-TEST-FIXTURE Holdings LLC (Formerly Riverside Properties Group)' },
]

interface OwnerRow {
  ownerId: string
  newOwnerName: string
  percentage: string
}

interface StagedFile {
  name: string
  size: string
}

const STEP_LABELS = ['Ownership', 'Property basics', 'Documents', 'Review']

export function PropertyCreationFlowPreview() {
  const [step, setStep] = useState(1)
  const [owners, setOwners] = useState<OwnerRow[]>([
    { ownerId: 'harness-llc-owner-a', newOwnerName: '', percentage: '55' },
    { ownerId: 'harness-llc-entity', newOwnerName: '', percentage: '' },
  ])
  const [allocationComplete, setAllocationComplete] = useState(false)
  const [basics, setBasics] = useState({ address: '300 New Construction Ave', city: 'Practiceville', state: 'IL', zip: '60000', status: 'active' })
  const [addressTouched, setAddressTouched] = useState(false)
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([
    { name: 'ZMR-TEST-PRACTICE-deed-preview.pdf', size: '412 KB' },
  ])

  const addOwnerRow = () => setOwners((prev) => [...prev, { ownerId: 'harness-llc-owner-a', newOwnerName: '', percentage: '' }])
  const updateOwnerRow = (i: number, patch: Partial<OwnerRow>) =>
    setOwners((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)))
  const removeOwnerRow = (i: number) => setOwners((prev) => prev.filter((_, idx) => idx !== i))
  const removeStagedFile = (i: number) => setStagedFiles((prev) => prev.filter((_, idx) => idx !== i))

  const ownerDisplayName = (o: OwnerRow) =>
    o.ownerId === 'new' ? o.newOwnerName || '(new owner not yet named)' : OWNER_OPTIONS.find((opt) => opt.id === o.ownerId)?.name ?? ''

  const enteredPercentages = owners.map((o) => Number(o.percentage)).filter((n) => !Number.isNaN(n) && n > 0)
  const percentageSum = enteredPercentages.reduce((a, b) => a + b, 0)

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
    <div style={{ maxWidth: 780 }}>
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
              <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
                <div className="field-row">
                  <div className="field" style={{ flex: 3 }}>
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
                      <div style={{ marginTop: 'var(--space-2)' }}>
                        <label htmlFor={`owner-new-name-${i}`}>New owner&rsquo;s name</label>
                        <input
                          id={`owner-new-name-${i}`}
                          value={owner.newOwnerName}
                          onChange={(e) => updateOwnerRow(i, { newOwnerName: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label htmlFor={`owner-pct-${i}`}>Percentage (optional)</label>
                    <input
                      id={`owner-pct-${i}`}
                      placeholder="Not yet known"
                      value={owner.percentage}
                      onChange={(e) => updateOwnerRow(i, { percentage: e.target.value })}
                    />
                  </div>
                  {owners.length > 1 && (
                    <div className="field" style={{ flex: '0 0 auto', justifyContent: 'flex-end', display: 'flex' }}>
                      <button type="button" onClick={() => removeOwnerRow(i)} aria-label="Remove owner" style={{ marginTop: 'var(--space-5)' }}>
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div className="field">
              <button type="button" onClick={addOwnerRow}>
                + Add another owner
              </button>
            </div>
            <p className="field-hint">
              {enteredPercentages.length} of {owners.length} owner{owners.length === 1 ? '' : 's'} {enteredPercentages.length === 1 ? 'has' : 'have'} a
              percentage entered so far — {percentageSum}% assigned. This is informational only and does not mark allocation complete.
            </p>
            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 400 }}>
                <input type="checkbox" checked={allocationComplete} onChange={(e) => setAllocationComplete(e.target.checked)} />
                All current owners are entered and their percentages total 100% — allocation is complete
              </label>
              <p className="field-hint">Leave unchecked if more owners still need to be added, or percentages aren&rsquo;t all known yet.</p>
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
              <div className="field" style={{ flex: 2 }}>
                <label htmlFor="basics-city">City</label>
                <input id="basics-city" value={basics.city} onChange={(e) => setBasics((p) => ({ ...p, city: e.target.value }))} />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="basics-state">State</label>
                <select id="basics-state" value={basics.state} onChange={(e) => setBasics((p) => ({ ...p, state: e.target.value }))}>
                  {US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ flex: 1 }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {stagedFiles.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: 'var(--space-2) var(--space-3)',
                      }}
                    >
                      <span style={{ flex: 2 }}>{f.name}</span>
                      <span style={{ flex: 1, color: 'var(--text)' }}>{f.size}</span>
                      <span className="status-badge status-badge-success" style={{ flex: 1 }}>
                        Ready to upload
                      </span>
                      <button type="button" onClick={() => removeStagedFile(i)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setStagedFiles((prev) => [...prev, { name: 'ZMR-TEST-PRACTICE-second-file.pdf', size: '198 KB' }])}
                style={{ marginTop: 'var(--space-2)' }}
              >
                Add files
              </button>
              <p className="field-hint">Nothing uploads until Save on the Review step.</p>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <>
          <div className="field-group-row field-group-row--two-col">
            <div className="property-field-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3 className="property-field-group-title">Property basics</h3>
                <button type="button" onClick={() => goToStep(2)}>
                  Edit
                </button>
              </div>
              <dl>
                <dt style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-h)' }}>{basics.address}</dt>
                <dd>
                  {basics.city}, {basics.state} {basics.zip}
                </dd>
                <dt>Status</dt>
                <dd>{basics.status}</dd>
              </dl>
            </div>

            <div className="property-field-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3 className="property-field-group-title">Ownership</h3>
                <button type="button" onClick={() => goToStep(1)}>
                  Edit
                </button>
              </div>
              <div className="field-column">
                {owners.map((owner, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{ownerDisplayName(owner)}</span>
                    <span>{owner.percentage ? `${owner.percentage}%` : 'percentage not yet entered'}</span>
                  </div>
                ))}
                <p className="field-hint">
                  {allocationComplete ? 'Allocation marked complete.' : 'Allocation incomplete — more owners may still be added.'}
                </p>
              </div>
            </div>
          </div>

          <div className="property-field-group" style={{ marginTop: 'var(--space-4)' }}>
            <h3 className="property-field-group-title">Documents</h3>
            <div className="field-column">
              {stagedFiles.length > 0 ? (
                stagedFiles.map((f, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{f.name}</span>
                    <span>{f.size}</span>
                  </div>
                ))
              ) : (
                <p className="field-hint">No documents staged.</p>
              )}
            </div>
          </div>
        </>
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
