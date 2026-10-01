import { useState } from 'react'
import { EditableSection } from '../../../shared/EditableSection'
import { UNASSIGNED_TENANTS } from './agentFixtures'
import { formatMoney } from './agentFormat'
import type { TenantAssignment } from './agentTypes'

interface AgentAssignmentsBoxProps {
  assignments: TenantAssignment[]
  blockedIds: Set<string>
  onSave: (next: TenantAssignment[]) => void
}

// One agent, many tenant assignments. View lists each tenant it bills;
// Edit adds, pauses or removes assignments (non-saving preview).
export function AgentAssignmentsBox({ assignments, blockedIds, onSave }: AgentAssignmentsBoxProps) {
  const [draft, setDraft] = useState<TenantAssignment[]>(assignments)
  const assignedIds = new Set(draft.map((a) => a.id))
  const addable = UNASSIGNED_TENANTS.filter((t) => !assignedIds.has(t.id))

  const view =
    assignments.length === 0 ? (
      <p className="empty-state">No tenants assigned.</p>
    ) : (
      <ul className="agents-assignments">
        {assignments.map((a) => (
          <li key={a.id} className={a.paused ? 'agents-assignment row-voided' : 'agents-assignment'}>
            <span className="agents-assignment-main">
              <span className="agents-assignment-name">{a.tenantName}</span>
              <span className="agents-row-meta">{a.unitLabel}</span>
            </span>
            <span className="agents-assignment-side">
              {a.monthlyRent !== null && <span className="agents-assignment-rent">{formatMoney(a.monthlyRent)}/mo</span>}
              {a.paused ? (
                <span className="status-badge status-badge-neutral">Paused</span>
              ) : blockedIds.has(a.id) ? (
                <span className="status-badge status-badge-warning">Needs fix</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    )

  const edit = (exitEditing: () => void) => (
    <div className="agents-edit">
      <ul className="agents-assignments">
        {draft.map((a) => (
          <li key={a.id} className="agents-assignment">
            <span className="agents-assignment-main">
              <span className="agents-assignment-name">{a.tenantName}</span>
              <span className="agents-row-meta">{a.unitLabel} · {a.leaseLabel}</span>
            </span>
            <span className="agents-assignment-side">
              <label className="agents-inline-check">
                <input
                  type="checkbox"
                  checked={a.paused}
                  onChange={(e) => setDraft(draft.map((d) => (d.id === a.id ? { ...d, paused: e.target.checked } : d)))}
                />
                Paused
              </label>
              <button type="button" className="agents-compact-button" onClick={() => setDraft(draft.filter((d) => d.id !== a.id))}>
                Remove
              </button>
            </span>
          </li>
        ))}
      </ul>
      {addable.length > 0 && (
        <div className="agents-add-row">
          <span className="agents-row-meta">Tenants with an active lease not yet assigned:</span>
          {addable.map((t) => (
            <button key={t.id} type="button" className="agents-compact-button" onClick={() => setDraft([...draft, t])}>
              Add {t.tenantName}
            </button>
          ))}
        </div>
      )}
      <div className="agents-edit-actions">
        <button type="submit" onClick={() => { onSave(draft); exitEditing() }}>Save</button>
        <button type="button" onClick={exitEditing}>Cancel</button>
      </div>
    </div>
  )

  return (
    <EditableSection
      title={`Tenant assignments (${assignments.length})`}
      defaultOpen
      view={view}
      edit={edit}
      onEditStart={() => setDraft(assignments)}
    />
  )
}
