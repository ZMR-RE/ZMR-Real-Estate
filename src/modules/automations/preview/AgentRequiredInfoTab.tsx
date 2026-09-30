import { CollapsibleSection } from '../../../shared/CollapsibleSection'
import { assignmentGaps, INPUT_REQUIREMENTS, type InputRequirement } from './agentInputs'
import type { Agent, DutyId } from './agentTypes'
import { PreviewDestinationLink } from './PreviewDestinationLink'

interface AgentRequiredInfoTabProps {
  agent: Agent
}

const GROUPS: InputRequirement['group'][] = ['Tenant & lease', 'Issuer & numbering', 'Invoices & receipts', 'Payments', 'Assistant', 'Delivery']

// What's missing per tenant (with a link to fix it where an existing field
// can hold it), then the full field map: every field, whether the dashboard
// has it, and its dashboard home.
export function AgentRequiredInfoTab({ agent }: AgentRequiredInfoTabProps) {
  const dutyLabel = (id: DutyId) => agent.duties.find((d) => d.id === id)?.label ?? id
  const gaps = agent.assignments.filter((a) => !a.paused).flatMap(assignmentGaps)
  const missingCount = INPUT_REQUIREMENTS.filter((r) => r.source.kind === 'missing').length

  return (
    <div className="agents-overview">
      <CollapsibleSection title={`Missing for assigned tenants (${gaps.length})`} defaultOpen>
        {gaps.length === 0 ? (
          <p className="empty-state">Every assigned tenant has the information the assistant reads today.</p>
        ) : (
          <ul className="agents-assignments">
            {gaps.map((g) => (
              <li key={`${g.assignmentId}-${g.requirementId}`} className="agents-assignment">
                <span className="agents-assignment-main">
                  <span className="agents-assignment-name">{agent.assignments.find((a) => a.id === g.assignmentId)?.tenantName}</span>
                  <span className="agents-row-meta">{g.message}</span>
                </span>
                {g.href && g.actionLabel && <PreviewDestinationLink label={g.actionLabel} href={g.href} destination={g.destinationLabel} />}
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      <CollapsibleSection title={`Field map (${INPUT_REQUIREMENTS.length} fields, ${missingCount} not in the dashboard yet)`} defaultOpen>
        <p className="field-hint">“New” fields can’t be filled by entering data — each needs its own approval. Every new field extends an existing record where possible; none creates a separate agent ledger or document copy.</p>
        {GROUPS.map((group) => (
          <div key={group} className="agents-field-group">
            <h4 className="property-details-title">{group}</h4>
            <div className="table-scroll">
              <table className="agents-table agents-table--wrap">
                <thead>
                  <tr>
                    <th scope="col">Field</th>
                    <th scope="col">Today</th>
                    <th scope="col">Dashboard home</th>
                    <th scope="col">Reuses</th>
                  </tr>
                </thead>
                <tbody>
                  {INPUT_REQUIREMENTS.filter((r) => r.group === group).map((r) => (
                    <tr key={r.id}>
                      <td>
                        {r.label}
                        <span className="agents-row-meta agents-block">{r.duties.map(dutyLabel).join(', ')}</span>
                      </td>
                      <td>
                        {r.source.kind === 'existing' ? (
                          <span className="status-badge status-badge-neutral">Exists</span>
                        ) : (
                          <span className="status-badge status-badge-warning">New</span>
                        )}
                      </td>
                      <td>{r.source.home}</td>
                      <td>{r.source.kind === 'existing' ? <code>{r.source.field}</code> : `${r.source.proposedField} — ${r.source.reuse}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </CollapsibleSection>
    </div>
  )
}
