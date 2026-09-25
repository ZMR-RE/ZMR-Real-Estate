import { useState } from 'react'
import { US_STATES } from '../shared/usStates'

// Batch S / Package 1 — VISUAL PREVIEW ONLY, not wired into the
// application. Distinct from PropertyFormGroupedPreview.tsx (which
// previews the single-page, post-create grouped EDIT form): this
// component previews the separate four-step CREATION flow Batch B
// originally approved (OWN-04: "Ownership → Property basics →
// Documents (optional) → Review"), per the Package 1 contract §4 — the
// two are different screens for different moments, not two versions of
// the same one.
//
// No redundant required Name (step 2 shows it as optional, matching the
// real, shipped `properties.name` nullable-column change). No duplicate
// flat owner/contact entry — step 1 only ever adds structured ownership
// entries (name + optional percentage + an explicit allocation-
// completeness assertion, the same shape `property_ownership_interests`
// already uses), never a flat text field. Nothing here saves — Save at
// step 4 is disabled, and every step is reachable by clicking its own
// tab so a reviewer can see all four without pretending to fill the
// whole thing in order.
//
// "Review ownership" and "Review saved contact details" (owner-
// approved labels, Sept 25 2026) are a DIFFERENT, separate mechanism —
// the existing-property action that reconciles a legacy/unconfirmed
// record (Package 1 contract §2/§3). This wizard's own step 4 is just
// called "Review", matching Batch B's own approved step name; the two
// are not the same screen and this preview does not conflate them.
export function PropertyCreationFlowPreview() {
  const [step, setStep] = useState(1)
  const [owners, setOwners] = useState([{ name: 'ZMR-TEST-PRACTICE Owner A', percentage: '' }])
  const [allocationComplete, setAllocationComplete] = useState(false)
  const [basics, setBasics] = useState({
    name: '',
    address: '300 New Construction Ave',
    city: 'Practiceville',
    state: 'IL',
    zip: '60000',
    status: 'active',
  })
  const [stagedFiles] = useState<string[]>(['ZMR-TEST-PRACTICE-deed-preview.pdf'])

  const addOwner = () => setOwners((prev) => [...prev, { name: '', percentage: '' }])
  const updateOwner = (i: number, field: 'name' | 'percentage', value: string) =>
    setOwners((prev) => prev.map((o, idx) => (idx === i ? { ...o, [field]: value } : o)))

  const steps = ['Ownership', 'Property basics', 'Documents', 'Review']

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="preview-banner">
        BATCH S / PACKAGE 1 VISUAL PREVIEW — property CREATION flow (four steps). Not saved, not wired into the
        application. Every value below is fictional.
      </div>

      <div className="preview-steps">
        {steps.map((label, i) => {
          const n = i + 1
          const cls = n === step ? 'preview-step preview-step--active' : n < step ? 'preview-step preview-step--done' : 'preview-step'
          return (
            <button key={label} type="button" className={cls} style={{ background: 'none', border: 'none', borderBottom: '3px solid transparent', cursor: 'pointer' }} onClick={() => setStep(n)}>
              {n}. {label}
            </button>
          )
        })}
      </div>

      {step === 1 && (
        <div className="property-field-group">
          <h3 className="property-field-group-title">Step 1 — Ownership</h3>
          <div className="field-column">
            {owners.map((owner, i) => (
              <div className="field-row" key={i}>
                <div className="field">
                  <label htmlFor={`owner-name-${i}`}>Owner</label>
                  <input
                    id={`owner-name-${i}`}
                    value={owner.name}
                    placeholder="Pick an existing owner or add one"
                    onChange={(e) => updateOwner(i, 'name', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor={`owner-pct-${i}`}>Percentage (optional)</label>
                  <input
                    id={`owner-pct-${i}`}
                    placeholder="Unknown for now"
                    value={owner.percentage}
                    onChange={(e) => updateOwner(i, 'percentage', e.target.value)}
                  />
                </div>
              </div>
            ))}
            <div className="field">
              <button type="button" onClick={addOwner}>
                + Add another owner
              </button>
            </div>
            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 400 }}>
                <input type="checkbox" checked={allocationComplete} onChange={(e) => setAllocationComplete(e.target.checked)} />
                All current owners are entered — allocation is complete
              </label>
              <p className="field-hint">
                Never inferred from percentages. Left unchecked, additional owners may still be added later without
                this being treated as a correction.
              </p>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="property-field-group">
          <h3 className="property-field-group-title">Step 2 — Property basics</h3>
          <div className="field-column">
            <div className="field">
              <label htmlFor="basics-name">Name</label>
              <input
                id="basics-name"
                value={basics.name}
                placeholder="(optional — address identifies the property)"
                onChange={(e) => setBasics((p) => ({ ...p, name: e.target.value }))}
              />
              <p className="field-hint">No longer required.</p>
            </div>
            <div className="field">
              <label htmlFor="basics-address">
                Address<span className="required-marker">*</span>
              </label>
              <input id="basics-address" required value={basics.address} onChange={(e) => setBasics((p) => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="basics-city">
                  City<span className="required-marker">*</span>
                </label>
                <input id="basics-city" required value={basics.city} onChange={(e) => setBasics((p) => ({ ...p, city: e.target.value }))} />
              </div>
              <div className="field">
                <label htmlFor="basics-state">
                  State<span className="required-marker">*</span>
                </label>
                <select id="basics-state" required value={basics.state} onChange={(e) => setBasics((p) => ({ ...p, state: e.target.value }))}>
                  {US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="basics-zip">
                  Zip<span className="required-marker">*</span>
                </label>
                <input id="basics-zip" required value={basics.zip} onChange={(e) => setBasics((p) => ({ ...p, zip: e.target.value }))} />
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
          <p className="field-hint" style={{ marginTop: 'var(--space-3)' }}>
            Acquisition (purchase price/date/method) and Building details (living area, lot size, etc.) are not part
            of this flow — those stay editable afterward on the property's own Overview tab, same as today.
          </p>
        </div>
      )}

      {step === 3 && (
        <div className="property-field-group">
          <h3 className="property-field-group-title">Step 3 — Documents (optional)</h3>
          <div className="field-column">
            <div className="field">
              <label>Deed / acquisition documents</label>
              <ul style={{ margin: 0, paddingLeft: 'var(--space-5)' }}>
                {stagedFiles.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <input type="file" disabled />
              <p className="field-hint">
                Selected files are staged only — nothing uploads until Step 4's Save actually creates the property.
                Skipping this step entirely is allowed.
              </p>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="property-field-group">
          <h3 className="property-field-group-title">Step 4 — Review</h3>
          <div className="field-column">
            <dl className="field-grid">
              <div className="field">
                <dt>Owners</dt>
                <dd>
                  {owners
                    .filter((o) => o.name)
                    .map((o) => `${o.name}${o.percentage ? ` — ${o.percentage}%` : ' — percentage not yet known'}`)
                    .join('; ') || '—'}
                </dd>
              </div>
              <div className="field">
                <dt>Allocation</dt>
                <dd>{allocationComplete ? 'Complete' : 'Incomplete — more owners may still be added'}</dd>
              </div>
              {basics.name && (
                <div className="field">
                  <dt>Name</dt>
                  <dd>{basics.name}</dd>
                </div>
              )}
              <div className="field">
                <dt>Address</dt>
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
                  <dt>Documents</dt>
                  <dd>{stagedFiles.join(', ')}</dd>
                </div>
              )}
            </dl>
            <p className="field-hint">
              Empty fields are omitted here, same as any other view-only box. Save below is the one point where the
              property and its first ownership interest are created together.
            </p>
            <button type="button" disabled aria-disabled="true">
              Save (preview only — disabled, does not save)
            </button>
          </div>
        </div>
      )}

      <div className="preview-callouts">
        <h4 className="property-details-title">What this flow is, and isn't</h4>
        <ul>
          <li>
            This is the property-<strong>creation</strong> path only. Editing an existing property never re-enters
            this wizard — it opens the separate, already-approved grouped Edit form preview instead (this
            component's sibling, <code>PropertyFormGroupedPreview.tsx</code>), for Acquisition/Building Details
            included.
          </li>
          <li>
            "Review ownership" and "Review saved contact details" are a different, existing-property action (for a
            legacy/unconfirmed record) — not this wizard's own Step 4, which is just called "Review" per Batch B's
            original approval.
          </li>
        </ul>
      </div>
    </div>
  )
}
