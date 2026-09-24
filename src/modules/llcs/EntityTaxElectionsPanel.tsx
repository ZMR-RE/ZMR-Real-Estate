import { useState } from 'react'
import { PickListSelect } from '../../shared/pickLists/PickListSelect'
import { useEntityTaxElections } from './useEntityTaxElections'
import type { LlcTaxElectionInput } from './llcsQueries'

interface EntityTaxElectionsPanelProps {
  llcId: string
}

const STATUS_LABELS: Record<string, string> = {
  unknown: 'Unknown',
  no_election_recorded: 'No election recorded',
  submitted: 'Submitted',
  accepted: 'Accepted',
  superseded: 'Superseded',
}

const BLANK_INPUT: LlcTaxElectionInput = {
  election_type: '',
  status: 'submitted',
  submitted_date: null,
  effective_date: null,
  acceptance_date: null,
  notes: null,
}

// Election history — its own append-log, not gated behind the Tax
// classification box's Edit (elections are never overwritten in place
// except for an ordinary status progression on the same row; a
// genuinely new election supersedes the old one instead). Not gated
// behind EditableSection at all: "+ Add election" and "Accept"/"Supersede"
// are always-available actions on this list, same reasoning
// LlcFinancialAccountsPanel.tsx already documents for its own
// always-editable admin panel shape.
export function EntityTaxElectionsPanel({ llcId }: EntityTaxElectionsPanelProps) {
  const { elections, loading, error, saving, add, updateStatus, supersede } = useEntityTaxElections(llcId)
  const [isAdding, setIsAdding] = useState(false)
  const [supersedingId, setSupersedingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<LlcTaxElectionInput>(BLANK_INPUT)

  const startAdd = () => {
    setSupersedingId(null)
    setDraft(BLANK_INPUT)
    setIsAdding(true)
  }

  const startSupersede = (id: string) => {
    setIsAdding(false)
    setDraft(BLANK_INPUT)
    setSupersedingId(id)
  }

  const cancelForm = () => {
    setIsAdding(false)
    setSupersedingId(null)
  }

  const handleSubmit = async () => {
    if (!draft.election_type) return
    const ok = supersedingId ? await supersede(supersedingId, draft) : await add(draft)
    if (ok) cancelForm()
  }

  return (
    <div>
      <h4 className="property-details-title">Election history</h4>
      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : elections.length === 0 ? (
        <p className="empty-state">No elections on file yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Accepted</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {elections.map((election) => (
              <tr key={election.id} className={election.status === 'superseded' ? 'row-voided' : ''}>
                <td>{election.election_type}</td>
                <td>
                  <span className="status-badge status-badge-neutral">{STATUS_LABELS[election.status]}</span>
                </td>
                <td>{election.submitted_date ?? ''}</td>
                <td>{election.acceptance_date ?? ''}</td>
                <td>
                  {election.status === 'submitted' && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => updateStatus(election.id, 'accepted', new Date().toISOString().slice(0, 10))}
                    >
                      Mark accepted
                    </button>
                  )}
                  {election.status !== 'superseded' && (
                    <button
                      type="button"
                      disabled={saving}
                      title="Records a new election row and marks this one Superseded — never rewrites this row's own facts"
                      onClick={() => startSupersede(election.id)}
                    >
                      Supersede
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isAdding || supersedingId ? (
        <div className="field-column">
          <label htmlFor="election_type">
            Election type <span className="required-marker">*</span>
          </label>
          <PickListSelect
            id="election_type"
            listName="tax_election_type"
            title="Tax election types"
            value={draft.election_type}
            onChange={(value) => setDraft((prev) => ({ ...prev, election_type: value }))}
            placeholder="Select election type…"
          />
          <label htmlFor="election_submitted_date">Submitted date</label>
          <input
            id="election_submitted_date"
            type="date"
            value={draft.submitted_date ?? ''}
            onChange={(e) => setDraft((prev) => ({ ...prev, submitted_date: e.target.value || null }))}
          />
          <label htmlFor="election_notes">Notes</label>
          <textarea
            id="election_notes"
            value={draft.notes ?? ''}
            onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value || null }))}
          />
          <button type="button" disabled={saving || !draft.election_type} onClick={handleSubmit}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={cancelForm} disabled={saving}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" onClick={startAdd}>
          + Add election
        </button>
      )}
    </div>
  )
}
