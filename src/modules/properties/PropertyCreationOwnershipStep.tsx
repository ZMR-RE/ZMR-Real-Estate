import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { SearchableSelect } from '../../shared/SearchableSelect'
import type { OwnershipDraftEntry } from './propertyCreationDraft'

interface PropertyCreationOwnershipStepProps {
  entries: OwnershipDraftEntry[]
  llcOptions: SearchableSelectOption[]
  allocationStatus: 'incomplete' | 'complete'
  onAddRow: () => void
  onSetRowMode: (index: number, mode: 'existing' | 'new') => void
  onUpdateRow: (index: number, patch: Partial<OwnershipDraftEntry>) => void
  onRemoveRow: (index: number) => void
  onAllocationStatusChange: (status: 'incomplete' | 'complete') => void
}

// Package 1 — Ownership step, real (shipped) component. Each row is its
// own bordered block; the owner picker (SearchableSelect, the one
// app-wide type-ahead component — DESIGN-SYSTEM.md) is given more width
// than the short percentage field. "+ Add new" is SearchableSelect's own
// existing inline-creation affordance, switching that row into naming a
// new owner rather than opening a separate flow. The new owner isn't
// created until Save (usePropertyCreationWizard's save()) — cancelling
// or abandoning the wizard leaves no orphaned llcs row.
export function PropertyCreationOwnershipStep({
  entries,
  llcOptions,
  allocationStatus,
  onAddRow,
  onSetRowMode,
  onUpdateRow,
  onRemoveRow,
  onAllocationStatusChange,
}: PropertyCreationOwnershipStepProps) {
  const chosenOwnerIds = new Set(entries.filter((e) => e.mode === 'existing' && e.ownerId).map((e) => e.ownerId))

  const enteredPercentages = entries.map((e) => Number(e.percentageText)).filter((n) => !Number.isNaN(n) && n > 0)
  const percentageSum = enteredPercentages.reduce((a, b) => a + b, 0)

  return (
    <div className="property-field-group">
      <h3 className="property-field-group-title">Ownership</h3>
      <div className="field-column">
        {entries.map((row, index) => (
          <div key={index} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
            <div className="field-row">
              <div className="field" style={{ flex: 3 }}>
                <label htmlFor={`wizard-owner-${index}`}>Owner</label>
                {row.mode === 'existing' ? (
                  <SearchableSelect
                    options={llcOptions.filter((o) => !chosenOwnerIds.has(o.id) || o.id === row.ownerId)}
                    value={row.ownerId ?? null}
                    onChange={(id) => onUpdateRow(index, { ownerId: id })}
                    placeholder="Search existing owners/entities…"
                    onAddNew={() => onSetRowMode(index, 'new')}
                    addNewLabel="+ Add a new owner"
                  />
                ) : (
                  <div style={{ marginTop: 'var(--space-2)' }}>
                    <label htmlFor={`wizard-new-owner-name-${index}`}>New owner&rsquo;s name</label>
                    <input
                      id={`wizard-new-owner-name-${index}`}
                      value={row.newOwnerName ?? ''}
                      onChange={(e) => onUpdateRow(index, { newOwnerName: e.target.value })}
                    />
                    <button type="button" onClick={() => onSetRowMode(index, 'existing')}>
                      Choose an existing owner instead
                    </button>
                  </div>
                )}
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor={`wizard-owner-pct-${index}`}>Percentage (optional)</label>
                <input
                  id={`wizard-owner-pct-${index}`}
                  placeholder="Not yet known"
                  value={row.percentageText}
                  onChange={(e) => onUpdateRow(index, { percentageText: e.target.value })}
                />
              </div>
              <div className="field" style={{ flex: '0 0 auto', justifyContent: 'flex-end', display: 'flex' }}>
                <button type="button" onClick={() => onRemoveRow(index)} aria-label="Remove owner" style={{ marginTop: 'var(--space-5)' }}>
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}

        <div className="field">
          <button type="button" onClick={onAddRow}>
            + Add another owner
          </button>
        </div>

        <p className="field-hint">
          {enteredPercentages.length} of {entries.length} owner{entries.length === 1 ? '' : 's'}{' '}
          {enteredPercentages.length === 1 ? 'has' : 'have'} a percentage entered so far — {percentageSum}% assigned. This is
          informational only and does not mark allocation complete.
        </p>

        <div className="field">
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 400 }}>
            <input
              type="checkbox"
              checked={allocationStatus === 'complete'}
              onChange={(e) => onAllocationStatusChange(e.target.checked ? 'complete' : 'incomplete')}
            />
            All current owners are entered and their percentages total 100% — allocation is complete
          </label>
          <p className="field-hint">Leave unchecked if more owners still need to be added, or percentages aren&rsquo;t all known yet.</p>
        </div>
      </div>
    </div>
  )
}
