import { CollapsibleSection } from '../../../shared/CollapsibleSection'
import type { Agent, CheckResult } from './agentTypes'

interface AgentChecksTabProps {
  agent: Agent
}

const RESULT_LABEL: Record<CheckResult, string> = { pass: 'Pass', fail: 'Needs fix', not_run: 'Not run' }
// Pass stays neutral — a passing check is ordinary, not an alert.
const RESULT_BADGE: Record<CheckResult, string> = {
  pass: 'status-badge-neutral',
  fail: 'status-badge-warning',
  not_run: 'status-badge-neutral',
}

export function AgentChecksTab({ agent }: AgentChecksTabProps) {
  const tenantName = (id: string | null) =>
    id === null ? 'All records' : agent.assignments.find((a) => a.id === id)?.tenantName ?? 'Removed assignment'
  const review = agent.practiceReview

  return (
    <div className="agents-overview">
      <CollapsibleSection title="Training" defaultOpen>
        {review ? (
          <>
            <dl className="agents-dl agents-dl--inline">
              <div>
                <dt>Practice drafts reviewed</dt>
                <dd>{review.reviewed}</dd>
              </div>
              <div>
                <dt>Approved unchanged</dt>
                <dd>{review.approvedUnchanged}</dd>
              </div>
              <div>
                <dt>Corrected</dt>
                <dd>{review.corrected}</dd>
              </div>
              <div>
                <dt>Rejected</dt>
                <dd>{review.rejected}</dd>
              </div>
            </dl>
            <p className="field-hint">How many reviewed practice drafts are required before activation is an open decision.</p>
          </>
        ) : (
          <p className="empty-state">No practice drafts reviewed yet.</p>
        )}
      </CollapsibleSection>

      <CollapsibleSection title={`Checks before each draft (${agent.checks.length})`} defaultOpen>
        {agent.checks.length === 0 ? (
          <p className="empty-state">No checks configured.</p>
        ) : (
          <ul className="agents-checks">
            {agent.checks.map((check) => (
              <li key={check.id} className="agents-check">
                <p className="agents-assignment-name">{check.label}</p>
                <p className="agents-row-meta">{check.description}</p>
                <ul className="agents-check-results">
                  {check.results.map((r) => (
                    <li key={`${check.id}-${r.assignmentId ?? 'all'}`}>
                      <span className="agents-check-subject">{tenantName(r.assignmentId)}</span>
                      <span className={`status-badge ${RESULT_BADGE[r.result]}`}>{RESULT_LABEL[r.result]}</span>
                      {r.detail && <span className="agents-row-meta agents-check-detail">{r.detail}</span>}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>
    </div>
  )
}
