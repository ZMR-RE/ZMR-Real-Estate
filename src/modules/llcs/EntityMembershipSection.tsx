import { useState } from 'react'
import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { SearchableSelect } from '../../shared/SearchableSelect'
import { EditableSection } from '../../shared/EditableSection'
import { NO_LLC_ID } from './useLlcs'
import { validateOwnershipEntriesClientSide, type AllocationStatus, type OwnershipEntryInput } from './ownershipInterestsQueries'
import { useEntityMembershipInterests } from './useEntityMembershipInterests'

interface EntityMembershipSectionProps {
  llcId: string
  llcOptions: SearchableSelectOption[]
}

interface DraftEntry {
  memberId: string
  memberLabel: string
  percentageText: string
}

const COMPLETENESS_LABEL: Record<AllocationStatus, string> = {
  incomplete: 'Incomplete — more members may still be added',
  complete: 'Complete — this is the full membership roster',
}

// Entity membership roster (I1/G1: "entity C 50% Owner A/50% Owner C"),
// kept fully separate from property title ownership. Same mechanism as
// PropertyOwnershipInterestsSection: every add/remove/percentage change
// requires a reason, and completeness is an explicit assertion, never
// inferred from the entered percentages.
export function EntityMembershipSection({ llcId, llcOptions }: EntityMembershipSectionProps) {
  const { members, completeness, loading, error, saving, save } = useEntityMembershipInterests(llcId)
  const [draft, setDraft] = useState<DraftEntry[] | null>(null)
  const [reason, setReason] = useState('')
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null)
  const [markComplete, setMarkComplete] = useState(false)
  const [clientError, setClientError] = useState<string | null>(null)

  // A member must be a real llcs row — never the sentinel "unresolved"
  // option, and never this entity itself (the database also enforces
  // this; excluding it here avoids a round trip just to hit that error).
  const memberOptions = llcOptions.filter((o) => o.id !== NO_LLC_ID && o.id !== llcId)

  const seedDraft = () => {
    setDraft(
      members.map((m) => ({
        memberId: m.member_llc_id,
        memberLabel: m.member_name,
        percentageText: m.percentage === null ? '' : String(m.percentage),
      })),
    )
    setReason('')
    setMarkComplete(completeness === 'complete')
    setClientError(null)
  }

  const draftToEntries = (rows: DraftEntry[]): OwnershipEntryInput[] =>
    rows.map((r) => ({ ownerId: r.memberId, percentage: r.percentageText.trim() === '' ? null : Number(r.percentageText) }))

  const handleAddMember = () => {
    if (!addingMemberId || !draft) return
    const option = memberOptions.find((o) => o.id === addingMemberId)
    if (!option || draft.some((d) => d.memberId === addingMemberId)) return
    setDraft([...draft, { memberId: addingMemberId, memberLabel: option.label, percentageText: '' }])
    setAddingMemberId(null)
  }

  const handleRemove = (memberId: string) => {
    if (!draft) return
    setDraft(draft.filter((d) => d.memberId !== memberId))
  }

  const handleSave = async (exitEditing: () => void) => {
    if (!draft) return
    const entries = draftToEntries(draft)
    const allocationStatus: AllocationStatus = markComplete ? 'complete' : 'incomplete'
    const clientCheck = validateOwnershipEntriesClientSide(entries, allocationStatus)
    if (!clientCheck.valid) {
      setClientError(clientCheck.error ?? 'Invalid membership entry.')
      return
    }
    if (!reason.trim()) {
      setClientError('A reason is required for this change.')
      return
    }
    setClientError(null)
    const ok = await save(entries, reason.trim(), allocationStatus)
    if (ok) exitEditing()
  }

  return (
    <EditableSection
      title="Membership"
      onEditStart={seedDraft}
      view={
        loading ? (
          <p>Loading…</p>
        ) : members.length === 0 ? (
          <p className="empty-state">No members on file yet.</p>
        ) : (
          <>
            <dl className="field-grid">
              {members.map((member) => (
                <div className="field" key={member.id}>
                  <dt>{member.member_name}</dt>
                  <dd>{member.percentage === null ? 'Percentage not recorded' : `${member.percentage}%`}</dd>
                </div>
              ))}
            </dl>
            <p>
              <span className={`status-badge ${completeness === 'complete' ? 'status-badge-success' : 'status-badge-neutral'}`}>
                {completeness === 'complete' ? 'Complete roster' : 'Incomplete — more members may still be added'}
              </span>
            </p>
          </>
        )
      }
      edit={(exitEditing) => (
        <div className="field-column">
          {(error || clientError) && <p role="alert">{clientError ?? error}</p>}

          {(draft ?? []).map((row) => (
            <div key={row.memberId}>
              <label htmlFor={`membership_pct_${row.memberId}`}>{row.memberLabel}</label>
              <input
                id={`membership_pct_${row.memberId}`}
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="Percentage (leave blank if unknown)"
                value={row.percentageText}
                onChange={(e) =>
                  setDraft((prev) =>
                    (prev ?? []).map((d) => (d.memberId === row.memberId ? { ...d, percentageText: e.target.value } : d)),
                  )
                }
              />
              <button type="button" onClick={() => handleRemove(row.memberId)} disabled={saving}>
                Remove
              </button>
            </div>
          ))}

          <div>
            <label htmlFor="membership_add_member">Add member</label>
            <SearchableSelect
              options={memberOptions.filter((o) => !(draft ?? []).some((d) => d.memberId === o.id))}
              value={addingMemberId}
              onChange={setAddingMemberId}
              placeholder="Search existing owners/entities…"
            />
            <button type="button" onClick={handleAddMember} disabled={saving || !addingMemberId}>
              + Add member
            </button>
          </div>

          <label htmlFor="membership_mark_complete">
            <input
              id="membership_mark_complete"
              type="checkbox"
              checked={markComplete}
              onChange={(e) => setMarkComplete(e.target.checked)}
            />
            This is the complete membership roster (every member listed, percentages totaling 100%)
          </label>
          <p>Currently marked: {COMPLETENESS_LABEL[markComplete ? 'complete' : 'incomplete']}</p>

          <div>
            <label htmlFor="membership_reason">
              Reason for this change <span className="required-marker">*</span>
            </label>
            <textarea
              id="membership_reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Selected the wrong member when this entity was first added"
            />
          </div>

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
