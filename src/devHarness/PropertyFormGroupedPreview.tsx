import { useState } from 'react'
import { US_STATES } from '../shared/usStates'

// BATCH S3 — VISUAL PREVIEW ONLY. Not wired into the application.
// Existing-property Edit context — every field PropertyForm.tsx
// renders is accounted for, regrouped per the Sept 25 2026 screen-
// organization review into five named groups instead of the prior
// pass's three, balanced into two explicit columns (not auto-flowed)
// so one side isn't a single huge group against a nearly-empty other
// side:
//   Left  — Identity & location, Jurisdiction & identifiers, Ownership
//           & saved contacts (14 fields/actions total)
//   Right — Acquisition, Building & site (14 fields/actions total)
// Purchase method and the Deed reference moved into Acquisition (were
// previously buried in a general "Property details" catch-all and
// under a Purchase heading respectively); Property type moved into
// Identity & location; Exterior information's own standalone group
// merged into Building & site so it isn't a short column sitting next
// to a very long one; "Review saved contact details" got its own named
// group instead of implying it's an acquisition-specific contact.
//
// Name is kept, not removed — this is the EXISTING-property Edit
// context, where a saved value must stay visible/editable — but
// listed after property type/status as a secondary field, labeled
// "Name (optional label)" (matches the real, already-implemented
// nullable-name change).
//
// Photo/Deed now show a realistic existing-record state (an existing
// property already has whichever of these were uploaded) rather than
// the creation-only "not available until saved" limitation, which was
// wrong for this context.
//
// No pick-list/"left blank"/"not wired" implementation notes remain in
// the rendered area — one banner at the top is the only meta-commentary
// shown; every other visible line is either a real field or the same
// short behavior description the button itself would need in the real
// app (e.g. what "Review saved contact details" opens).
export function PropertyFormGroupedPreview() {
  const [values, setValues] = useState({
    name: 'ZMR-TEST-PRACTICE Preview Property',
    address: '300 Preview Lane',
    city: 'Practiceville',
    state: 'IL',
    zip: '60000',
    status: 'active',
    property_type: 'single_family',
    purchase_price: '285000',
    purchase_date: '2024-03-15',
    purchase_method: 'traditional_sale',
    square_footage: '1850',
    lot_size_value: '0.25',
    lot_size_unit: 'acres',
    year_built: '1998',
    bedroom_count: '3',
    bathroom_count: '2',
    basement: 'finished',
    garage_spaces: '2',
    street_parking: '',
    parking_notes: '',
    property_tax_id: '',
    municipal_zoning_code: '',
    county_assessor_use_code: '',
    county: '',
    township: '',
  })
  const [exteriorMaterials, setExteriorMaterials] = useState<string[]>(['Brick'])

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

      <form onSubmit={(e) => e.preventDefault()} style={{ maxWidth: 960 }}>
        <div className="field-group-row field-group-row--two-col">
          {/* Left column */}
          <div className="field-column" style={{ gap: 'var(--space-6)' }}>
            <div className="property-field-group">
              <h3 className="property-field-group-title">Identity &amp; location</h3>
              <div className="field-column">
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
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="p-property-type">Property type</label>
                    <select id="p-property-type" value={values.property_type} onChange={(e) => setValues((p) => ({ ...p, property_type: e.target.value }))}>
                      <option value="single_family">Single family</option>
                      <option value="multi_family">Multi-family</option>
                      <option value="condo">Condo</option>
                    </select>
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
                <div className="field">
                  <label htmlFor="p-name">Name (optional label)</label>
                  <input id="p-name" {...set('name')} />
                </div>
                <div className="field">
                  <label>Photo</label>
                  <button type="button" disabled>
                    View current photo
                  </button>
                </div>
              </div>
            </div>

            <div className="property-field-group">
              <h3 className="property-field-group-title">Jurisdiction &amp; identifiers</h3>
              <div className="field-column">
                <div className="field">
                  <label htmlFor="p-taxid">Property tax ID/PIN</label>
                  <input id="p-taxid" {...set('property_tax_id')} />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="p-county">County</label>
                    <input id="p-county" {...set('county')} />
                  </div>
                  <div className="field">
                    <label htmlFor="p-township">Township</label>
                    <input id="p-township" {...set('township')} />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="p-zoning">Municipal zoning code</label>
                  <select id="p-zoning" value={values.municipal_zoning_code} onChange={(e) => setValues((p) => ({ ...p, municipal_zoning_code: e.target.value }))}>
                    <option value="">Select…</option>
                    <option value="r1">R-1 Residential</option>
                    <option value="r2">R-2 Residential</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="p-assessor">County assessor use code</label>
                  <select id="p-assessor" value={values.county_assessor_use_code} onChange={(e) => setValues((p) => ({ ...p, county_assessor_use_code: e.target.value }))}>
                    <option value="">Select…</option>
                    <option value="101">101 — Single family</option>
                    <option value="102">102 — Duplex</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="property-field-group">
              <h3 className="property-field-group-title">Ownership &amp; saved contacts</h3>
              <div className="field-column">
                <div className="field">
                  <button type="button" disabled>
                    Review saved contact details
                  </button>
                  <p className="field-hint">
                    Opens a review of any existing contact info before saving anything — never confirms or replaces
                    the original value automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="field-column" style={{ gap: 'var(--space-6)' }}>
            <div className="property-field-group">
              <h3 className="property-field-group-title">Acquisition</h3>
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
                <div className="field">
                  <label htmlFor="p-purchase-method">Purchase method</label>
                  <select id="p-purchase-method" value={values.purchase_method} onChange={(e) => setValues((p) => ({ ...p, purchase_method: e.target.value }))}>
                    <option value="traditional_sale">Traditional sale</option>
                    <option value="foreclosure">Foreclosure</option>
                    <option value="inherited">Inherited</option>
                  </select>
                </div>
                <div className="field">
                  <label>Deed document</label>
                  <button type="button" disabled>
                    View current deed document
                  </button>
                </div>
              </div>
            </div>

            <div className="property-field-group">
              <h3 className="property-field-group-title">Building &amp; site</h3>
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
                </div>
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
                </div>
                <div className="field">
                  <label htmlFor="p-parking-notes">Parking notes</label>
                  <textarea id="p-parking-notes" {...set('parking_notes')} />
                </div>
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
