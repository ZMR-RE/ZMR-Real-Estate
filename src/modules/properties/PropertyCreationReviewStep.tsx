import { ownerRowDisplayName, type OwnershipDraftEntry } from './propertyCreationDraft'
import type { StagedFile } from './usePropertyCreationWizard'
import type { SearchableSelectOption } from '../../shared/SearchableSelect'

interface Basics {
  address: string
  city: string
  state: string
  zip: string
  status: 'active' | 'inactive' | 'sold'
}

interface PropertyCreationReviewStepProps {
  basics: Basics
  ownershipEntries: OwnershipDraftEntry[]
  llcOptions: SearchableSelectOption[]
  allocationStatus: 'incomplete' | 'complete'
  stagedFiles: StagedFile[]
  onEditBasics: () => void
  onEditOwnership: () => void
  onEditDocuments: () => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Package 1 — Review step, corrected per the Sept 28 approval: Documents
// now has its own top-right Edit action (back to Step 3) alongside
// Property basics/Ownership's; an owner row with no percentage yet
// reads as a single, non-wrapping "Percentage not yet entered" line in
// its own column rather than cramped inline text.
export function PropertyCreationReviewStep({
  basics,
  ownershipEntries,
  llcOptions,
  allocationStatus,
  stagedFiles,
  onEditBasics,
  onEditOwnership,
  onEditDocuments,
}: PropertyCreationReviewStepProps) {
  return (
    <>
      <div className="field-group-row field-group-row--two-col">
        <div className="property-field-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h3 className="property-field-group-title">Property basics</h3>
            <button type="button" onClick={onEditBasics}>
              Edit
            </button>
          </div>
          <dl>
            <dt style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-h)' }}>{basics.address || '(no address entered)'}</dt>
            <dd>
              {basics.city}
              {basics.city && basics.state ? ', ' : ''}
              {basics.state} {basics.zip}
            </dd>
            <dt>Status</dt>
            <dd>{basics.status}</dd>
          </dl>
        </div>

        <div className="property-field-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h3 className="property-field-group-title">Ownership</h3>
            <button type="button" onClick={onEditOwnership}>
              Edit
            </button>
          </div>
          <div className="field-column">
            {ownershipEntries.length === 0 && <p className="empty-state">No owner entered yet.</p>}
            {ownershipEntries.map((row, i) => (
              <div key={i} className="field-row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span>{ownerRowDisplayName(row, llcOptions)}</span>
                <span style={{ whiteSpace: 'nowrap', color: row.percentageText ? 'var(--text-h)' : 'var(--text)' }}>
                  {row.percentageText ? `${row.percentageText}%` : 'Percentage not yet entered'}
                </span>
              </div>
            ))}
            <p className="field-hint">
              {allocationStatus === 'complete' ? 'Allocation marked complete.' : 'Allocation incomplete — more owners may still be added.'}
            </p>
          </div>
        </div>
      </div>

      <div className="property-field-group" style={{ marginTop: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h3 className="property-field-group-title">Documents</h3>
          <button type="button" onClick={onEditDocuments}>
            Edit
          </button>
        </div>
        <div className="field-column">
          {stagedFiles.length > 0 ? (
            <>
              {/* Release-readiness corrections (owner-approved document-
                  linking requirement) — each file's own explicit choice
                  (from the Documents step), not a blanket "every owner"
                  summary. */}
              {stagedFiles.map((f) => {
                const linkedNames = ownershipEntries.filter((row) => f.linkedOwnerRowKeys.includes(row.rowKey)).map((row) => ownerRowDisplayName(row, llcOptions))
                return (
                  <div key={f.fileKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                    <span>
                      {f.name} <span className="field-hint">({formatSize(f.size)})</span>
                    </span>
                    <span style={{ whiteSpace: 'nowrap' }}>{linkedNames.length > 0 ? linkedNames.join(', ') : 'Property only'}</span>
                  </div>
                )
              })}
            </>
          ) : (
            <p className="field-hint">No documents staged.</p>
          )}
        </div>
      </div>
    </>
  )
}
