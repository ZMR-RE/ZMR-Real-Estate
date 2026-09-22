import { useState, type FormEvent } from 'react'
import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { SearchableSelect } from '../../shared/SearchableSelect'
import { PickListSelect } from '../../shared/pickLists/PickListSelect'
import { InfoTooltip } from '../../shared/InfoTooltip'
import { US_STATES } from '../../shared/usStates'
import { LlcForm } from '../llcs/LlcForm'
import type { LlcInput } from '../llcs/llcsQueries'
import { NO_LLC_ID } from '../llcs/useLlcs'
import type { HoldingCompanyInput } from '../holdingCompanies/holdingCompaniesQueries'
import type { PropertyInput } from './propertiesQueries'

interface PropertyFormProps {
  initialValues: PropertyInput
  llcOptions: SearchableSelectOption[]
  onCreateLlc: (input: LlcInput) => Promise<{ id: string } | { error: string }>
  holdingCompanyOptions: SearchableSelectOption[]
  onCreateHoldingCompany: (input: HoldingCompanyInput) => Promise<{ id: string } | { error: string }>
  saving: boolean
  onSave: (input: PropertyInput) => void
  onCancel: () => void
}

export function PropertyForm({
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
    <form onSubmit={handleSubmit}>
      {/* Roadmap 7.31 — identity fields (matches View mode's
          PropertyIdentityHeader: no group title of its own). Single
          column throughout except City/State/Zip, the item's own stated
          exception since the three are genuinely one logical unit. */}
      <div className="field-column">
        <div className="field">
          <label htmlFor="name">
            Name<span className="required-marker">*</span>
          </label>
          <input
            id="name"
            required
            value={values.name}
            onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
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

        <div className="field">
          <label htmlFor="contact_email">Contact email</label>
          <input id="contact_email" type="email" {...field('contact_email')} />
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

      {/* Roadmap 7.31 — subsection headers restored, matching View
          mode's PROPERTY_FIELD_GROUPS (propertyFieldGroups.ts) exactly:
          same titles, same field order. */}
      <div className="property-field-group">
        <h3 className="property-field-group-title">Purchase &amp; valuation</h3>
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
        </div>
      </div>

      <div className="property-field-group">
        <h3 className="property-field-group-title">Physical facts</h3>
        <div className="field-column">
          <div className="field">
            <label htmlFor="square_footage">Square footage</label>
            <input
              id="square_footage"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              {...field('square_footage')}
            />
          </div>

          <div className="field">
            <label htmlFor="lot_size">Lot size</label>
            <input id="lot_size" {...field('lot_size')} placeholder="e.g. 0.25 acres, 5,000 sqft" />
          </div>

          {/* Roadmap 7.31 — Bedrooms/Bathrooms, the item's other stated
              tight-row exception. */}
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

          {/* Roadmap 7.31 — Basement converted from free text to a pick
              list (Finished/Unfinished/Partially finished/None). */}
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

          {/* Roadmap 7.31 — parking split into three fields, replacing
              the single "Garage/parking spaces" number. */}
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

          <div className="field">
            <label htmlFor="property_tax_id">Property tax ID/PIN</label>
            <input id="property_tax_id" {...field('property_tax_id')} />
          </div>

          {/* Roadmap 7.31 — Zoning/use code split into two real fields. */}
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

          {/* Roadmap 7.31 — County/Township, the item's third stated
              tight-row exception. */}
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
            <label htmlFor="purchase_method">Purchase method</label>
            <PickListSelect
              id="purchase_method"
              listName="purchase_method"
              title="Purchase method"
              placeholder="Select a purchase method…"
              {...pickListField('purchase_method')}
            />
          </div>

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
