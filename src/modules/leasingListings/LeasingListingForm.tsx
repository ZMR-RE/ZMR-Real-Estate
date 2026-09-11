import { useState, type FormEvent } from 'react'
import { PickListSelect } from '../../shared/pickLists/PickListSelect'
import type { LeasingListingInput } from './leasingListingsQueries'

interface LeasingListingFormProps {
  initialValues: LeasingListingInput
  saving: boolean
  onSave: (input: LeasingListingInput) => void
  onCancel: () => void
}

export function LeasingListingForm({ initialValues, saving, onSave, onCancel }: LeasingListingFormProps) {
  const [values, setValues] = useState<LeasingListingInput>(initialValues)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave(values)
  }

  return (
    <form onSubmit={handleSubmit}>
      <PickListSelect
        id="listing_platform"
        listName="listing_platform"
        title="Platforms"
        value={values.platform}
        onChange={(platform) => setValues((prev) => ({ ...prev, platform }))}
        placeholder="Select platform…"
        required
      />

      <label htmlFor="date_posted">Date posted</label>
      <input
        id="date_posted"
        type="date"
        required
        value={values.date_posted}
        onChange={(e) => setValues((prev) => ({ ...prev, date_posted: e.target.value }))}
      />

      <label htmlFor="listing_notes">Prospective tenant notes</label>
      <textarea
        id="listing_notes"
        value={values.notes ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, notes: e.target.value || null }))}
      />

      <button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </form>
  )
}
