import { useState } from 'react'
import { US_STATES } from '../shared/usStates'

// BATCH S3 — VISUAL PREVIEW ONLY. Not wired into the application. This
// is a fork, not an edit, of the real PropertyForm.tsx — every field
// name/label/input type is accounted for (cross-checked line by line
// against PropertyForm.tsx during the Batch S reconciliation review),
// though three of them (Owner name/Contact phone/Contact email) are now
// shown as the owner-approved "Review saved contact details" action
// instead of raw inputs, per the retirement approved Sept 25 2026 — see
// below. Two fields the real form renders as live upload widgets
// (Photo, Deed) can't sensibly appear in a non-saving preview with no
// real propertyId/storage behind them — they are shown as clearly-
// labeled static placeholders below, not omitted.
// Every pick-list field (basement, street parking, municipal zoning
// code, county assessor use code, purchase method, property type,
// exterior wall materials) is shown as a plain select/checkbox with an
// inline "(pick list)" note rather than wired to the
// real PickListSelect/PickListCheckboxGroup components, since those pull
// live account-scoped list data this static preview has no reason to
// depend on — the point here is the layout, not re-testing the pick-list
// system itself (already covered elsewhere).
//
// Layout is the same fields, the same `.property-field-group`/
// `.field-row` classes, regrouped into `.field-group-row--two-col` (a
// two-column-only variant of the `.field-group-row` class INS-1 already
// introduced for Insurance) instead of stacked full-width sections.
//
// Reconciliation fix — the earlier version of this preview relied on an
// outer wrapper `<div style={{maxWidth: 960}}>` to look wide, but never
// widened the `<form>` element itself, which is subject to the app-wide
// `form { max-width: 480px }` rule (src/index.css, "Forms" section) —
// a rule every OTHER form in the app still uses. This preview's own
// `<form>` carries an explicit inline `style={{ maxWidth: 960 }}` for
// the same reason the real Insurance Edit form now has its own
// dedicated `.insurance-policy-form { max-width: 960px }` override
// (owner-approved, implemented locally, verified in Practice, not
// deployed — index.css) — this property form's own equivalent width
// change is still pending its own visual approval, so this preview
// keeps using an inline style rather than adding a real CSS class ahead
// of that sign-off.
//
// Revised this pass — no redundant required Name (matches the real,
// already-implemented nullable-name change, propertiesQueries.ts/
// PropertyForm.tsx), re-labeled here as an optional legacy field rather
// than removed outright, since this component represents the EXISTING-
// property Edit context where a saved name must stay visible/editable,
// not the creation flow (see PropertyCreationFlowPreview.tsx, which has
// no Name field at all). The flat Owner name/Contact phone/Contact
// email fields are replaced with the owner-approved "Review saved
// contact details" action (label approved Sept 25 2026) — a button that
// would open a review before saving, never silently confirm or replace
// the original legacy value, per the Package 1 contract's §3 mechanism.
// The action itself is not wired to anything real here (this preview
// still doesn't save); only its presence and label are shown. No
// engineering/status prose is rendered in the visible preview area
// itself — that context lives here, in comments, and in the project's
// own planning docs, not in the customer-facing screen.
//
// Nothing here saves: the Save button is disabled and onSubmit is
// prevented with no network call. Some fields are shown populated and
// some left empty in the SAME render, so both states are visible at
// once: Address/City/State/Zip/Status/Purchase price/Purchase
// date/Living area/Lot size/Year built/Bedrooms/Bathrooms/Garage spaces
// are filled with fictional values; every pick-list field, Property tax
// ID, County/Township, and Parking notes are left blank on purpose.
export function PropertyFormGroupedPreview() {
  const [values, setValues] = useState({
    name: 'ZMR-TEST-PRACTICE Preview Property',
    address: '300 Preview Lane',
    city: 'Practiceville',
    state: 'IL',
    zip: '60000',
    status: 'active',
    purchase_price: '285000',
    purchase_date: '2024-03-15',
    square_footage: '1850',
    lot_size_value: '0.25',
    lot_size_unit: 'acres',
    year_built: '1998',
    bedroom_count: '3',
    bathroom_count: '2',
    basement: '',
    garage_spaces: '2',
    street_parking: '',
    parking_notes: '',
    property_tax_id: '',
    municipal_zoning_code: '',
    county_assessor_use_code: '',
    county: '',
    township: '',
    purchase_method: '',
    property_type: '',
  })
  const [exteriorMaterials, setExteriorMaterials] = useState<string[]>([])

  const set = (key: keyof typeof values) => ({
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((prev) => ({ ...prev, [key]: e.target.value })),
  })

  const toggleExterior = (material: string) => {
    setExteriorMaterials((prev) =>
      prev.includes(material) ? prev.filter((m) => m !== material) : [...prev, material],
    )
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <div className="preview-banner">
        BATCH S3 VISUAL PREVIEW — NOT SAVED, NOT WIRED INTO THE APPLICATION. Every field below is fictional.
      </div>

      {/* See the file-level comment: the app-wide `form { max-width:
          480px }` rule is overridden here, inline, for this one preview
          only. */}
      <form onSubmit={(e) => e.preventDefault()} style={{ maxWidth: 960 }}>
        <div className="field-group-row field-group-row--two-col">
          <div className="property-field-group">
            <h3 className="property-field-group-title">Identity &amp; location</h3>
            <div className="field-column">
              <div className="field">
                <label>Photo</label>
                <p className="field-hint">Upload — not available until the property is saved.</p>
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="p-name">Name (optional label)</label>
                  <input id="p-name" {...set('name')} />
                </div>
                <div className="field">
                  <label htmlFor="p-org">Organization type</label>
                  <input id="p-org" value="Individual ownership" readOnly />
                </div>
              </div>

              <div className="field">
                <label htmlFor="p-address">Address</label>
                <input id="p-address" {...set('address')} />
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="p-city">City</label>
                  <input id="p-city" {...set('city')} />
                </div>
                <div className="field">
                  <label htmlFor="p-state">State</label>
                  <select id="p-state" value={values.state} onChange={(e) => setValues((p) => ({ ...p, state: e.target.value }))}>
                    {US_STATES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="p-zip">Zip</label>
                  <input id="p-zip" {...set('zip')} />
                </div>
              </div>

              <div className="field">
                <label htmlFor="p-status">Status</label>
                <select id="p-status" value={values.status} onChange={(e) => setValues((p) => ({ ...p, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="sold">Sold</option>
                </select>
              </div>
            </div>
          </div>

          <div className="property-field-group">
            <h3 className="property-field-group-title">Purchase &amp; valuation</h3>
            <div className="field-column">
              <div className="field-row">
                <div className="field">
                  <label htmlFor="p-price">Purchase price ($)</label>
                  <input id="p-price" type="number" {...set('purchase_price')} />
                </div>
                <div className="field">
                  <label htmlFor="p-date">Purchase date</label>
                  <input id="p-date" type="date" {...set('purchase_date')} />
                </div>
              </div>
            </div>

            {/* Owner-approved Sept 25 2026: the flat Owner name/Contact
                phone/Contact email fields are retired from this form.
                Their legacy values are never lost — they stay on the
                record and are reachable through the review action below
                (Package 1 contract §3) — this form just stops offering
                them as raw editable inputs. */}
            <h4 className="property-field-group-title property-field-group-title--nested">Contact details</h4>
            <div className="field-column">
              <div className="field">
                <button type="button" disabled>
                  Review saved contact details
                </button>
                <p className="field-hint">
                  Opens a review of any existing contact info before saving anything — never confirms or replaces
                  the original value automatically. Not wired in this preview.
                </p>
              </div>
              <div className="field">
                <label>Deed document</label>
                <p className="field-hint">Upload — not available until the property is saved.</p>
              </div>
            </div>
          </div>

          <div className="property-field-group">
            <h3 className="property-field-group-title">Property details</h3>
            <div className="field-column">
              <div className="field">
                <label htmlFor="p-sqft">Living area (sq ft)</label>
                <input id="p-sqft" type="number" {...set('square_footage')} />
              </div>
              <div className="field">
                <label htmlFor="p-lot">Lot size</label>
                <div className="field-row">
                  <input id="p-lot" type="number" {...set('lot_size_value')} />
                  <select
                    id="p-lot-unit"
                    value={values.lot_size_unit}
                    onChange={(e) => setValues((p) => ({ ...p, lot_size_unit: e.target.value }))}
                  >
                    <option value="sqft">Sq ft</option>
                    <option value="acres">Acres</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label htmlFor="p-year">Year built</label>
                <input id="p-year" type="number" {...set('year_built')} />
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="p-bed">Bedrooms (whole building)</label>
                  <input id="p-bed" type="number" {...set('bedroom_count')} />
                </div>
                <div className="field">
                  <label htmlFor="p-bath">Bathrooms (whole building)</label>
                  <input id="p-bath" type="number" {...set('bathroom_count')} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="p-basement">Basement</label>
                <select id="p-basement" value={values.basement} onChange={(e) => setValues((p) => ({ ...p, basement: e.target.value }))}>
                  <option value="">Select a basement type…</option>
                  <option value="finished">Finished</option>
                  <option value="unfinished">Unfinished</option>
                  <option value="partially_finished">Partially finished</option>
                  <option value="none">None</option>
                </select>
                <p className="field-hint">(pick list)</p>
              </div>
              <div className="field">
                <label htmlFor="p-garage">Garage spaces</label>
                <input id="p-garage" type="number" {...set('garage_spaces')} />
              </div>
              <div className="field">
                <label htmlFor="p-street-parking">Street parking</label>
                <select
                  id="p-street-parking"
                  value={values.street_parking}
                  onChange={(e) => setValues((p) => ({ ...p, street_parking: e.target.value }))}
                >
                  <option value="">Select a street parking option…</option>
                  <option value="permitted">Permitted</option>
                  <option value="restricted">Restricted</option>
                  <option value="none">None</option>
                </select>
                <p className="field-hint">(pick list)</p>
              </div>
              <div className="field">
                <label htmlFor="p-parking-notes">Parking notes</label>
                <textarea id="p-parking-notes" placeholder="(left blank in this preview)" {...set('parking_notes')} />
              </div>
              <div className="field">
                <label htmlFor="p-taxid">Property tax ID/PIN</label>
                <input id="p-taxid" placeholder="(left blank in this preview)" {...set('property_tax_id')} />
              </div>
              <div className="field">
                <label htmlFor="p-zoning">Municipal zoning code</label>
                <input id="p-zoning" placeholder="(left blank in this preview)" {...set('municipal_zoning_code')} />
                <p className="field-hint">(pick list)</p>
              </div>
              <div className="field">
                <label htmlFor="p-assessor">County assessor use code</label>
                <input id="p-assessor" placeholder="(left blank in this preview)" {...set('county_assessor_use_code')} />
                <p className="field-hint">(pick list)</p>
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="p-county">County</label>
                  <input id="p-county" placeholder="(left blank in this preview)" {...set('county')} />
                </div>
                <div className="field">
                  <label htmlFor="p-township">Township</label>
                  <input id="p-township" placeholder="(left blank in this preview)" {...set('township')} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="p-purchase-method">Purchase method</label>
                <input id="p-purchase-method" placeholder="(left blank in this preview)" {...set('purchase_method')} />
                <p className="field-hint">(pick list)</p>
              </div>
              <div className="field">
                <label htmlFor="p-property-type">Property type</label>
                <input id="p-property-type" placeholder="(left blank in this preview)" {...set('property_type')} />
                <p className="field-hint">(pick list)</p>
              </div>
            </div>
          </div>

          <div className="property-field-group">
            <h3 className="property-field-group-title property-field-group-title--nested">Exterior information</h3>
            <div className="field-column">
              <div className="field">
                <label>Exterior wall material</label>
                {['Brick', 'Vinyl siding', 'Wood', 'Stucco', 'Stone'].map((material) => (
                  <label key={material} style={{ display: 'block', fontWeight: 400 }}>
                    <input
                      type="checkbox"
                      checked={exteriorMaterials.includes(material)}
                      onChange={() => toggleExterior(material)}
                    />{' '}
                    {material}
                  </label>
                ))}
                <p className="field-hint">(pick-list checkbox group)</p>
              </div>
            </div>
          </div>
        </div>

        <button type="submit" disabled aria-disabled="true">
          Save (preview only — disabled, does not save)
        </button>
      </form>
    </div>
  )
}
