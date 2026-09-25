import { useState } from 'react'
import { US_STATES } from '../shared/usStates'

// BATCH S3 — VISUAL PREVIEW ONLY. Not wired into the application. This
// is a fork, not an edit, of the real PropertyForm.tsx — every field
// name/label/input type below is copied verbatim from that file so nothing
// here misrepresents what fields exist. The one thing that's different is
// layout: the same fields, the same `.property-field-group`/`.field-row`
// classes, regrouped into `.field-group-row--two-col` (a new, two-column-
// only variant of the `.field-group-row` class INS-1 already introduced
// for Insurance — same responsive mechanism, not a new one) instead of
// stacked full-width sections. Nothing here saves: the Save button is
// disabled and onSubmit is prevented with no network call.
//
// Two fields are deliberately shown populated and two left empty, in the
// SAME render, so both states are visible at once without toggling
// anything: Name/Address/City/State/Zip/Status/Purchase price/Purchase
// date are filled with fictional values; Property tax ID, Municipal
// zoning code, County, Township, Parking notes, and Owner name/Contact
// phone/Contact email are left blank on purpose.
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
    owner_name: '',
    contact_phone: '',
    contact_email: '',
    square_footage: '1850',
    lot_size_value: '0.25',
    year_built: '1998',
    bedroom_count: '3',
    bathroom_count: '2',
    garage_spaces: '2',
    property_tax_id: '',
    municipal_zoning_code: '',
    county: '',
    township: '',
    parking_notes: '',
  })

  const set = (key: keyof typeof values) => ({
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((prev) => ({ ...prev, [key]: e.target.value })),
  })

  return (
    <div style={{ maxWidth: 960 }}>
      <div className="preview-banner">
        BATCH S3 VISUAL PREVIEW — NOT SAVED, NOT WIRED INTO THE APPLICATION. Every field below is fictional.
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        <div className="field-group-row field-group-row--two-col">
          <div className="property-field-group">
            <h3 className="property-field-group-title">Identity &amp; location</h3>
            <div className="field-column">
              <div className="field-row">
                <div className="field">
                  <label htmlFor="p-name">
                    Name<span className="required-marker">*</span>
                  </label>
                  <input id="p-name" required {...set('name')} />
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

            {/* S3 flag — see the callout below the form: this "Ownership"
                sub-block is the SAME flat Owner name/Contact phone/Contact
                email fields the real form already has here today, kept
                verbatim (not migrated) — it is not the new structured
                Ownership box (percentages, entities, atomic saves) the
                Overview tab now has. Both currently exist; this preview
                widens the layout, it does not resolve that duplication. */}
            <h4 className="property-field-group-title property-field-group-title--nested">Ownership (legacy flat fields)</h4>
            <div className="field-column">
              <div className="field-row">
                <div className="field">
                  <label htmlFor="p-owner">Owner name</label>
                  <input id="p-owner" placeholder="(left blank in this preview)" {...set('owner_name')} />
                </div>
                <div className="field">
                  <label htmlFor="p-phone">Contact phone</label>
                  <input id="p-phone" type="tel" placeholder="(left blank in this preview)" {...set('contact_phone')} />
                </div>
                <div className="field">
                  <label htmlFor="p-email">Contact email</label>
                  <input id="p-email" type="email" placeholder="(left blank in this preview)" {...set('contact_email')} />
                </div>
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
                <input id="p-lot" type="number" {...set('lot_size_value')} />
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
                <label htmlFor="p-garage">Garage spaces</label>
                <input id="p-garage" type="number" {...set('garage_spaces')} />
              </div>
              <div className="field">
                <label htmlFor="p-parking-notes">Parking notes</label>
                <textarea id="p-parking-notes" placeholder="(left blank in this preview)" {...set('parking_notes')} />
              </div>
            </div>
          </div>

          <div className="property-field-group">
            <h3 className="property-field-group-title">Tax &amp; zoning</h3>
            <div className="field-column">
              <div className="field">
                <label htmlFor="p-taxid">Property tax ID/PIN</label>
                <input id="p-taxid" placeholder="(left blank in this preview)" {...set('property_tax_id')} />
              </div>
              <div className="field">
                <label htmlFor="p-zoning">Municipal zoning code</label>
                <input id="p-zoning" placeholder="(left blank in this preview — real form uses a pick list)" {...set('municipal_zoning_code')} />
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
            </div>
          </div>
        </div>

        <button type="submit" disabled aria-disabled="true">
          Save (preview only — disabled, does not save)
        </button>
      </form>

      <div className="preview-callouts">
        <h4 className="property-details-title">What this preview does not resolve (flagged, not fixed here)</h4>
        <ul>
          <li>
            <strong>Two identifiers on one form.</strong> "Name" is still a required (*) field even though
            CLAUDE.md's Identifiers rule and the property page itself both treat the <em>address</em> as the
            real identifier (the profile page heading and registry sort by address; the entered Name value
            doesn't appear anywhere else in the app once saved, except back in the registry's own list row).
            Requiring a field that's then effectively unused elsewhere is a real point of confusion, not just a
            cosmetic one — flagged for a product decision, not resolved by widening the form.
          </li>
          <li>
            <strong>Two places to record ownership.</strong> This form's own "Owner name / Contact phone / Contact
            email" block (kept verbatim above) is flat free text with no percentage, no entity link, and no audit
            trail — it coexists with the real, structured Ownership box on the property's own Overview tab
            (percentages, linked entities, required reason, atomic save). Nothing here migrates one into the
            other or deletes either; this preview only asks the visual/product question of whether the registry
            form should still collect Owner name/Contact fields at all, given the Overview tab now has a real
            ownership model.
          </li>
        </ul>
      </div>
    </div>
  )
}
