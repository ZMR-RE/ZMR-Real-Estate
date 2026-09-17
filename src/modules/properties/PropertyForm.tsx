import { useState, type FormEvent } from 'react'
import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { SearchableSelect } from '../../shared/SearchableSelect'
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

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave(values)
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="name">Name</label>
      <input
        id="name"
        required
        value={values.name}
        onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
      />

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

      <label htmlFor="address">Address</label>
      <input id="address" {...field('address')} />

      <label htmlFor="city">City</label>
      <input id="city" {...field('city')} />

      <label htmlFor="state">State</label>
      <input id="state" {...field('state')} />

      <label htmlFor="zip">Zip</label>
      <input id="zip" {...field('zip')} />

      <label htmlFor="insurance_provider">Insurance provider</label>
      <input id="insurance_provider" {...field('insurance_provider')} />

      <label htmlFor="insurance_policy_number">Insurance policy number</label>
      <input id="insurance_policy_number" {...field('insurance_policy_number')} />

      <label htmlFor="contact_email">Contact email</label>
      <input id="contact_email" type="email" {...field('contact_email')} />

      <label htmlFor="purchase_price">Purchase price ($)</label>
      <input id="purchase_price" type="number" min="0" step="0.01" inputMode="decimal" {...field('purchase_price')} />
      <p>Used for cost basis / depreciation on the Mortgage tab — capital improvements are pulled from transactions automatically.</p>

      <label htmlFor="property_type">Property type</label>
      <input id="property_type" {...field('property_type')} placeholder="e.g. Single-family, Duplex" />

      <label htmlFor="purchase_date">Purchase date</label>
      <input id="purchase_date" type="date" {...field('purchase_date')} />

      <label htmlFor="purchase_method">Purchase method</label>
      <input id="purchase_method" {...field('purchase_method')} placeholder="e.g. Cash, Conventional loan, 1031 exchange" />

      <label htmlFor="property_tax_id">Property tax ID/PIN</label>
      <input id="property_tax_id" {...field('property_tax_id')} />

      <label htmlFor="county_township">County/Township</label>
      <input id="county_township" {...field('county_township')} />

      <label htmlFor="square_footage">Square footage</label>
      <input id="square_footage" type="number" min="0" step="1" inputMode="numeric" {...field('square_footage')} />

      <label htmlFor="lot_size">Lot size</label>
      <input id="lot_size" {...field('lot_size')} placeholder="e.g. 0.25 acres, 5,000 sqft" />

      <label htmlFor="zoning_use_code">Zoning/use code</label>
      <input id="zoning_use_code" {...field('zoning_use_code')} />

      <label htmlFor="bedroom_count">Bedrooms (whole building)</label>
      <input id="bedroom_count" type="number" min="0" step="1" inputMode="numeric" {...field('bedroom_count')} />

      <label htmlFor="bathroom_count">Bathrooms (whole building)</label>
      <input id="bathroom_count" type="number" min="0" step="0.5" inputMode="decimal" {...field('bathroom_count')} />

      <label htmlFor="basement">Basement</label>
      <input id="basement" {...field('basement')} placeholder="e.g. None, Unfinished, Finished walkout" />

      <label htmlFor="garage_parking_spaces">Garage/parking spaces</label>
      <input id="garage_parking_spaces" type="number" min="0" step="1" inputMode="numeric" {...field('garage_parking_spaces')} />

      <label htmlFor="status">Status</label>
      <select
        id="status"
        value={values.status}
        onChange={(e) =>
          setValues((prev) => ({ ...prev, status: e.target.value as PropertyInput['status'] }))
        }
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="sold">Sold</option>
      </select>

      <button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </form>
  )
}
