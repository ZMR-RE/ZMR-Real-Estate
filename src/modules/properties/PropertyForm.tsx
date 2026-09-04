import { useState, type FormEvent } from 'react'
import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { SearchableSelect } from '../../shared/SearchableSelect'
import type { PropertyInput } from './propertiesQueries'

interface PropertyFormProps {
  initialValues: PropertyInput
  llcOptions: SearchableSelectOption[]
  saving: boolean
  onSave: (input: PropertyInput) => void
  onCancel: () => void
}

export function PropertyForm({ initialValues, llcOptions, saving, onSave, onCancel }: PropertyFormProps) {
  const [values, setValues] = useState<PropertyInput>(initialValues)

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

      <label htmlFor="llc_id">LLC</label>
      <SearchableSelect
        options={llcOptions}
        value={values.llc_id}
        onChange={(id) => setValues((prev) => ({ ...prev, llc_id: id }))}
        placeholder="Select an LLC"
      />

      <label htmlFor="address">Address</label>
      <input id="address" {...field('address')} />

      <label htmlFor="city">City</label>
      <input id="city" {...field('city')} />

      <label htmlFor="state">State</label>
      <input id="state" {...field('state')} />

      <label htmlFor="zip">Zip</label>
      <input id="zip" {...field('zip')} />

      <label htmlFor="unit_config">Unit config</label>
      <input id="unit_config" {...field('unit_config')} />

      <label htmlFor="insurance_provider">Insurance provider</label>
      <input id="insurance_provider" {...field('insurance_provider')} />

      <label htmlFor="insurance_policy_number">Insurance policy number</label>
      <input id="insurance_policy_number" {...field('insurance_policy_number')} />

      <label htmlFor="contact_email">Contact email</label>
      <input id="contact_email" type="email" {...field('contact_email')} />

      <label htmlFor="market_value">Market value ($)</label>
      <input id="market_value" type="number" min="0" step="0.01" inputMode="decimal" {...field('market_value')} />

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
