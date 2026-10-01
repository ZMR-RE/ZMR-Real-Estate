import { useState } from 'react'
import { EditableSection } from '../../../shared/EditableSection'
import type { AgentDuty } from './agentTypes'

interface AgentDutiesBoxProps {
  duties: AgentDuty[]
  onSave: (next: AgentDuty[]) => void
}

// One rent-cycle specialist, many duties. Each duty can be switched on or
// off in Edit; duties that aren't built (delivery) stay off and say why.
export function AgentDutiesBox({ duties, onSave }: AgentDutiesBoxProps) {
  const [draft, setDraft] = useState<AgentDuty[]>(duties)

  const view = (
    <ul className="agents-assignments">
      {duties.map((d) => (
        <li key={d.id} className={d.enabled ? 'agents-assignment' : 'agents-assignment row-voided'}>
          <span className="agents-assignment-main">
            <span className="agents-assignment-name">{d.label}</span>
            <span className="agents-row-meta">{d.description}</span>
            {d.blockers.map((b) => (
              <span key={b} className="agents-row-meta agents-blocker">{b}</span>
            ))}
          </span>
          <span className="status-badge status-badge-neutral">
            {d.availability === 'not_built' ? 'Not built' : d.enabled ? 'On · drafts only' : 'Off'}
          </span>
        </li>
      ))}
    </ul>
  )

  const edit = (exitEditing: () => void) => (
    <div className="agents-edit">
      {draft.map((d) => (
        <label key={d.id} className="agents-inline-check">
          <input
            type="checkbox"
            checked={d.enabled}
            disabled={d.availability === 'not_built'}
            onChange={(e) => setDraft(draft.map((x) => (x.id === d.id ? { ...x, enabled: e.target.checked } : x)))}
          />
          {d.label}
          {d.availability === 'not_built' && <span className="agents-row-meta"> — not available: {d.blockers.join('; ')}</span>}
        </label>
      ))}
      <div className="agents-edit-actions">
        <button type="submit" onClick={() => { onSave(draft); exitEditing() }}>Save</button>
        <button type="button" onClick={exitEditing}>Cancel</button>
      </div>
    </div>
  )

  return <EditableSection title="Duties" defaultOpen view={view} edit={edit} onEditStart={() => setDraft(duties)} />
}
