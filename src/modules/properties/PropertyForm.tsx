import { useState, type FormEvent } from 'react'
import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { SearchableSelect } from '../../shared/SearchableSelect'
import { PickListSelect } from '../../shared/pickLists/PickListSelect'
import { PickListCheckboxGroup } from '../../shared/pickLists/PickListCheckboxGroup'
import { InfoTooltip } from '../../shared/InfoTooltip'
import { US_STATES } from '../../shared/usStates'
import { LlcForm } from '../llcs/LlcForm'
import type { LlcInput } from '../llcs/llcsQueries'
import { NO_LLC_ID } from '../llcs/useLlcs'
import type { HoldingCompanyInput } from '../holdingCompanies/holdingCompaniesQueries'
import type { PropertyInput } from './propertiesQueries'
import { PropertyPhotoUploadField } from './PropertyPhotoUploadField'
import { PropertyDeedUploadField } from './PropertyDeedUploadField'
import { ReviewSavedContactDetailsModal } from './ReviewSavedContactDetailsModal'
import { ExteriorInformationIcon, OwnershipIcon, PhysicalFactsIcon, PurchaseValuationIcon } from './propertyFieldGroupIcons'

interface PropertyFormProps {
  // Roadmap 7.32 (6) — null when creating a brand-new property (no row
  // exists yet to attach a photo document to); the photo upload field
  // is hidden entirely in that case rather than erroring.
  propertyId: string | null
  initialValues: PropertyInput
  llcOptions: SearchableSelectOption[]
  onCreateLlc: (input: LlcInput) => Promise<{ id: string } | { error: string }>
  holdingCompanyOptions: SearchableSelectOption[]
  onCreateHoldingCompany: (input: HoldingCompanyInput) => Promise<{ id: string } | { error: string }>
  saving: boolean
  onSave: (input: PropertyInput) => void
  onCancel: () => void
}

// Package 1 — regrouped per the Sept 25 2026 screen-organization review
// (approved with the Sept 28 corrections): five named groups instead of
// the prior Purchase & valuation/Property details/Exterior information
// split, balanced into two explicit columns so neither side is a single
// huge group against a near-empty other side. Every field, handler,
// pick list, and upload widget below is unchanged from before this
// pass — only their grouping/JSX position moved:
//   Left  — Identity & location, Jurisdiction & identifiers, Ownership
//           & saved contacts
//   Right — Acquisition, Building & site
// Purchase method and the Deed upload move into Acquisition (were under
// a generic "Property details"/the Ownership sub-list respectively);
// Property type moves into Identity & location; Exterior information's
// own standalone group merges into Building & site.
export function PropertyForm({
  propertyId,
  initialValues,
  llcOptions,
  onCreateLlc,
  holdingCompanyOptions,
  onCreateHoldingCompany,
  saving,
  onSave,
  onCancel,
}: PropertyFormProps) {
  const [values, setValues] = useState<PropertyInput>(initialValues)
  const [isAddingLlc, setIsAddingLlc] = useState(false)
  const [creatingLlc, setCreatingLlc] = useState(false)
  const [createLlcError, setCreateLlcError] = useState<string | null>(null)
  const [reviewingContacts, setReviewingContacts] = useState(false)

  const handleCreateLlc = async (input: LlcInput) => {
    setCreatingLlc(true)
    const result = await onCreateLlc(input)
    setCreatingLlc(false)

    if ('error' in result) {
      setCreateLlcError(result.error)
      return
    }

    setCreateLlcError(null)
    setValues((prev) => ({ ...prev, llc_id: result.id }))
    setIsAddingLlc(false)
  }

  const field = (key: keyof PropertyInput) => ({
    value: values[key] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((prev) => ({ ...prev, [key]: e.target.value || null })),
  })

  const pickListField = (key: keyof PropertyInput) => ({
    value: (values[key] as string | null) ?? '',
    onChange: (value: string) => setValues((prev) => ({ ...prev, [key]: value || null })),
  })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave(values)
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 960 }}>
      <div className="field-group-row field-group-row--two-col">
        {/* Left column */}
        <div className="field-column" style={{ gap: 'var(--space-6)' }}>
          <div className="property-field-group">
            <h3 className="property-field-group-title">Identity &amp; location</h3>
            <div className="field-column">
              {/* Roadmap 7.32 (6) — uploads immediately, independent of
                  this form's own Save (see PropertyPhotoUploadField's
                  own comment). */}
              {propertyId && <PropertyPhotoUploadField propertyId={propertyId} />}

              <div className="field">
                <label htmlFor="address">Address</label>
                <input id="address" {...field('address')} />
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="city">City</label>
                  <input id="city" {...field('city')} />
                </div>

                <div className="field">
                  <label htmlFor="state">State</label>
                  <select
                    id="state"
                    value={values.state ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, state: e.target.value || null }))}
                  >
                    <option value="">Select a state…</option>
                    {values.state && !US_STATES.some((s) => s.code === values.state) && (
                      <option value={values.state}>{values.state}</option>
                    )}
                    {US_STATES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="zip">Zip</label>
                  <input id="zip" {...field('zip')} />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="property_type">Property type</label>
                  <PickListSelect
                    id="property_type"
                    listName="property_type"
                    title="Property type"
                    placeholder="Select a property type…"
                    {...pickListField('property_type')}
                  />
                </div>

                <div className="field">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    value={values.status}
                    onChange={(e) => setValues((prev) => ({ ...prev, status: e.target.value as PropertyInput['status'] }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="sold">Sold</option>
                  </select>
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  {/* Package 1 — no longer required: address above is the
                      real identifier. Existing values are shown and left
                      editable; a blank value is stored as null, not ''. */}
                  <label htmlFor="name">Name (optional label)</label>
                  <input
                    id="name"
                    value={values.name ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value || null }))}
                  />
                </div>

                <div className="field">
                  <label htmlFor="llc_id">Organization type</label>
                  {isAddingLlc ? (
                    <LlcForm
                      saving={creatingLlc}
                      error={createLlcError}
                      holdingCompanyOptions={holdingCompanyOptions}
                      onCreateHoldingCompany={onCreateHoldingCompany}
                      onSave={handleCreateLlc}
                      onCancel={() => {
                        setIsAddingLlc(false)
                        setCreateLlcError(null)
                      }}
                    />
                  ) : (
                    <SearchableSelect
                      options={llcOptions}
                      value={values.llc_id ?? NO_LLC_ID}
                      onChange={(id) => setValues((prev) => ({ ...prev, llc_id: id === NO_LLC_ID ? null : id }))}
                      placeholder="Select an organization type"
                      onAddNew={() => setIsAddingLlc(true)}
                      addNewLabel="+ Add organization type"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="property-field-group">
            <h3 className="property-field-group-title">
              <PhysicalFactsIcon />
              Jurisdiction &amp; identifiers
            </h3>
            <div className="field-column">
              <div className="field">
                <label htmlFor="property_tax_id">Property tax ID/PIN</label>
                <input id="property_tax_id" {...field('property_tax_id')} />
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="county">County</label>
                  <input id="county" {...field('county')} />
                </div>

                <div className="field">
                  <label htmlFor="township">Township</label>
                  <input id="township" {...field('township')} />
                </div>
              </div>

              <div className="field">
                <label htmlFor="municipal_zoning_code">Municipal zoning code</label>
                <PickListSelect
                  id="municipal_zoning_code"
                  listName="municipal_zoning_code"
                  title="Municipal zoning codes"
                  placeholder="Select a municipal zoning code…"
                  {...pickListField('municipal_zoning_code')}
                />
              </div>

              <div className="field">
                <label htmlFor="county_assessor_use_code">County assessor use code</label>
                <PickListSelect
                  id="county_assessor_use_code"
                  listName="county_assessor_use_code"
                  title="County assessor use codes"
                  placeholder="Select a county assessor use code…"
                  {...pickListField('county_assessor_use_code')}
                />
              </div>
            </div>
          </div>

          <div className="property-field-group">
            <h3 className="property-field-group-title">
              <OwnershipIcon />
              Ownership &amp; saved contacts
            </h3>
            <div className="field-column">
              <div className="field-row">
                <div className="field">
                  <label htmlFor="owner_name">Owner name</label>
                  <input id="owner_name" {...field('owner_name')} />
                </div>

                <div className="field">
                  <label htmlFor="contact_phone">Contact phone</label>
                  <input id="contact_phone" type="tel" {...field('contact_phone')} />
                </div>

                <div className="field">
                  <label htmlFor="contact_email">Contact email</label>
                  <input id="contact_email" type="email" {...field('contact_email')} />
                </div>
              </div>

              {propertyId && (
                <div className="field">
                  <button type="button" onClick={() => setReviewingContacts(true)}>
                    Review saved contact details
                  </button>
                  <p className="field-hint">
                    Opens a review of the legacy owner/contact values above before linking them to a real, reusable contact
                    record — never confirms or replaces the original values automatically.
                  </p>
                </div>
              )}

              {propertyId && reviewingContacts && (
                <ReviewSavedContactDetailsModal
                  propertyId={propertyId}
                  legacyOwnerName={values.owner_name}
                  legacyContactPhone={values.contact_phone}
                  legacyContactEmail={values.contact_email}
                  onClose={() => setReviewingContacts(false)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="field-column" style={{ gap: 'var(--space-6)' }}>
          <div className="property-field-group">
            <h3 className="property-field-group-title">
              <PurchaseValuationIcon />
              Acquisition
            </h3>
            <div className="field-column">
              <div className="field">
                <label htmlFor="purchase_price">
                  Purchase price ($)
                  <InfoTooltip text="Used for cost basis / depreciation on the Mortgage tab — capital improvements are pulled from transactions automatically." />
                </label>
                <input
                  id="purchase_price"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  {...field('purchase_price')}
                />
              </div>

              <div className="field">
                <label htmlFor="purchase_date">Purchase date</label>
                <input id="purchase_date" type="date" {...field('purchase_date')} />
              </div>

              <div className="field">
                <label htmlFor="purchase_method">Purchase method</label>
                <PickListSelect
                  id="purchase_method"
                  listName="purchase_method"
                  title="Purchase method"
                  placeholder="Select a purchase method…"
                  {...pickListField('purchase_method')}
                />
              </div>

              {propertyId && <PropertyDeedUploadField propertyId={propertyId} />}
            </div>
          </div>

          <div className="property-field-group">
            <h3 className="property-field-group-title">
              <ExteriorInformationIcon />
              Building &amp; site
            </h3>
            <div className="field-column">
              <div className="field">
                <label htmlFor="square_footage">Living area (sq ft)</label>
                <input
                  id="square_footage"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  {...field('square_footage')}
                />
              </div>

              {/* Roadmap 7.32 (1) — Lot size gets a real unit toggle
                  instead of the old free-text field. Existing free-text
                  values (see propertiesQueries.ts's Property.lot_size
                  comment) aren't carried into lot_size_value — View mode
                  falls back to showing that raw text until the user
                  re-enters it here. */}
              <div className="field">
                <label htmlFor="lot_size_value">Lot size</label>
                <div className="field-row">
                  <input
                    id="lot_size_value"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    {...field('lot_size_value')}
                  />
                  <select
                    id="lot_size_unit"
                    value={values.lot_size_unit ?? 'sqft'}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, lot_size_unit: e.target.value as 'acres' | 'sqft' }))
                    }
                  >
                    <option value="sqft">Sq ft</option>
                    <option value="acres">Acres</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label htmlFor="year_built">Year built</label>
                <input id="year_built" type="number" min="0" step="1" inputMode="numeric" {...field('year_built')} />
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="bedroom_count">Bedrooms (whole building)</label>
                  <input
                    id="bedroom_count"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    {...field('bedroom_count')}
                  />
                </div>

                <div className="field">
                  <label htmlFor="bathroom_count">Bathrooms (whole building)</label>
                  <input
                    id="bathroom_count"
                    type="number"
                    min="0"
                    step="0.5"
                    inputMode="decimal"
                    {...field('bathroom_count')}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="basement">Basement</label>
                <PickListSelect
                  id="basement"
                  listName="basement_type"
                  title="Basement types"
                  placeholder="Select a basement type…"
                  {...pickListField('basement')}
                />
              </div>

              <div className="field">
                <label>Exterior wall material</label>
                <PickListCheckboxGroup
                  listName="exterior_wall_material"
                  title="Exterior wall materials"
                  value={values.exterior_wall_materials}
                  onChange={(value) => setValues((prev) => ({ ...prev, exterior_wall_materials: value }))}
                />
              </div>

              <div className="field">
                <label htmlFor="garage_spaces">Garage spaces</label>
                <input id="garage_spaces" type="number" min="0" step="1" inputMode="numeric" {...field('garage_spaces')} />
              </div>

              <div className="field">
                <label htmlFor="street_parking">Street parking</label>
                <PickListSelect
                  id="street_parking"
                  listName="street_parking"
                  title="Street parking"
                  placeholder="Select a street parking option…"
                  {...pickListField('street_parking')}
                />
              </div>

              <div className="field">
                <label htmlFor="parking_notes">Parking notes</label>
                <textarea id="parking_notes" value={values.parking_notes ?? ''} onChange={(e) => setValues((prev) => ({ ...prev, parking_notes: e.target.value || null }))} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </form>
  )
}
