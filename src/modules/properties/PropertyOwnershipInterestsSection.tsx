import { useState } from 'react'
import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { SearchableSelect } from '../../shared/SearchableSelect'
import { EditableSection } from '../../shared/EditableSection'
import { NO_LLC_ID } from '../llcs/useLlcs'
import { validateOwnershipEntriesClientSide, type OwnershipEntryInput } from '../llcs/ownershipInterestsQueries'
import { usePropertyOwnershipInterests } from './usePropertyOwnershipInterests'

interface PropertyOwnershipInterestsSectionProps {
  propertyId: string
  llcOptions: SearchableSelectOption[]
}

interface DraftEntry {
  ownerId: string
  ownerLabel: string
  percentageText: string
}

// O1-A ownership foundation (Batch G1) — a property's title ownership,
// now 1..N owners with optional percentages, replacing the single
// "Owned by" pointer as the source of truth for this display. Every
// add/remove/percentage-change here is one call to
// replacePropertyOwnershipInterests with a required reason (D1,
// generalized per I4) — there is no quick path that skips it.
export function PropertyOwnershipInterestsSection({ propertyId, llcOptions }: PropertyOwnershipInterestsSectionProps) {
  const { interests, loading, error, saving, save } = usePropertyOwnershipInterests(propertyId)
  const [draft, setDraft] = useState<DraftEntry[] | null>(null)
  const [reason, setReason] = useState('')
  const [addingOwnerId, setAddingOwnerId] = useState<string | null>(null)
  const [clientError, setClientError] = useState<string | null>(null)

  const realOwnerOptions = llcOptions.filter((o) => o.id !== NO_LLC_ID)

  const seedDraft = () => {
    setDraft(
      interests.map((i) => ({
        ownerId: i.llc_id,
        ownerLabel: i.owner_name,
        percentageText: i.percentage === null ? '' : String(i.percentage),
      })),
    )
    setReason('')
    setClientError(null)
  }

  const draftToEntries = (rows: DraftEntry[]): OwnershipEntryInput[] =>
    rows.map((r) => ({
      ownerId: r.ownerId,
      percentage: r.percentageText.trim() === '' ? null : Number(r.percentageText),
    }))

  const handleAddOwner = () => {
    if (!addingOwnerId || !draft) return
    const option = realOwnerOptions.find((o) => o.id === addingOwnerId)
    if (!option || draft.some((d) => d.ownerId === addingOwnerId)) return
    setDraft([...draft, { ownerId: addingOwnerId, ownerLabel: option.label, percentageText: '' }])
    setAddingOwnerId(null)
  }

  const handleRemove = (ownerId: string) => {
    if (!draft) return
    setDraft(draft.filter((d) => d.ownerId !== ownerId))
  }

  const handleSave = async (exitEditing: () => void) => {
    if (!draft) return
    const entries = draftToEntries(draft)
    const clientCheck = validateOwnershipEntriesClientSide(entries)
    if (!clientCheck.valid) {
      setClientError(clientCheck.error ?? 'Invalid ownership entry.')
      return
    }
    if (!reason.trim()) {
      setClientError('A reason is required for this change.')
      return
    }
    setClientError(null)
    const ok = await save(entries, reason.trim())
    if (ok) exitEditing()
  }

  return (
    <EditableSection
      title="Ownership"
      defaultOpen
      onEditStart={seedDraft}
      view={
        loading ? (
          <p>Loading…</p>
        ) : interests.length === 0 ? (
          <p className="empty-state">No owner on file yet.</p>
        ) : (
          <dl className="field-grid">
            {interests.map((interest) => (
              <div className="field" key={interest.id}>
                <dt>{interest.owner_name}</dt>
                <dd>{interest.percentage === null ? 'Percentage not recorded' : `${interest.percentage}%`}</dd>
              </div>
            ))}
          </dl>
        )
      }
      edit={(exitEditing) => (
        <div className="field-column">
          {(error || clientError) && <p role="alert">{clientError ?? error}</p>}

          {(draft ?? []).map((row) => (
            <div key={row.ownerId}>
              <label htmlFor={`ownership_pct_${row.ownerId}`}>{row.ownerLabel}</label>
              <input
                id={`ownership_pct_${row.ownerId}`}
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="Percentage (leave blank if unknown)"
                value={row.percentageText}
                onChange={(e) =>
                  setDraft((prev) =>
                    (prev ?? []).map((d) => (d.ownerId === row.ownerId ? { ...d, percentageText: e.target.value } : d)),
                  )
                }
              />
              <button type="button" onClick={() => handleRemove(row.ownerId)} disabled={saving}>
                Remove
              </button>
            </div>
          ))}

          <div>
            <label htmlFor="ownership_add_owner">Add owner</label>
            <SearchableSelect
              options={realOwnerOptions.filter((o) => !(draft ?? []).some((d) => d.ownerId === o.id))}
              value={addingOwnerId}
              onChange={setAddingOwnerId}
              placeholder="Search existing owners/entities…"
            />
            <button type="button" onClick={handleAddOwner} disabled={saving || !addingOwnerId}>
              + Add owner
            </button>
          </div>

          <div>
            <label htmlFor="ownership_reason">
              Reason for this change <span className="required-marker">*</span>
            </label>
            <textarea
              id="ownership_reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Selected the wrong entity when this property was first added"
            />
          </div>
          <p>
            This corrects an entry mistake — nothing about legal ownership actually changes here. Recording an actual legal
            ownership change (a real transfer) isn&rsquo;t part of this release yet.
          </p>

          <button type="button" disabled={saving} onClick={() => handleSave(exitEditing)}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={exitEditing} disabled={saving}>
            Cancel
          </button>
        </div>
      )}
    />
  )
}
