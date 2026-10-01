import { CollapsibleSection } from '../../../shared/CollapsibleSection'
import { AgentAssignmentsBox } from './AgentAssignmentsBox'
import { AgentDutiesBox } from './AgentDutiesBox'
import { formatRunTime } from './agentFormat'
import { blockedAssignmentIds, HEALTH_BADGE, HEALTH_LABEL, type HealthSummary } from './agentHealth'
import { AgentIssuersBox } from './AgentIssuersBox'
import { AgentScheduleBox } from './AgentScheduleBox'
import type { Agent, AgentDuty, AgentSchedule, RecordStore, TenantAssignment } from './agentTypes'

interface AgentOverviewTabProps {
  agent: Agent
  store: RecordStore
  health: HealthSummary
  onSaveAssignments: (next: TenantAssignment[]) => void
  onSaveDuties: (next: AgentDuty[]) => void
  onSaveSchedule: (next: AgentSchedule) => void
}

const CONNECTION_LABEL: Record<Agent['connection'], string> = {
  not_built: 'No mailbox connected — nothing is sent; documents stay in the dashboard',
  connected: 'Connected',
  disconnected: 'Disconnected',
}

export function AgentOverviewTab({ agent, store, health, onSaveAssignments, onSaveDuties, onSaveSchedule }: AgentOverviewTabProps) {
  const lastRun = agent.runs[0]

  return (
    <div className="agents-overview">
      <CollapsibleSection title="Health" defaultOpen>
        <dl className="agents-dl">
          <div>
            <dt>Current state</dt>
            <dd><span className={`status-badge ${HEALTH_BADGE[health.health]}`}>{HEALTH_LABEL[health.health]}</span></dd>
          </div>
          {health.reasons.length > 0 && (
            <div>
              <dt>Why</dt>
              <dd>
                <ul className="agents-reasons">
                  {health.reasons.map((r) => <li key={r}>{r}</li>)}
                </ul>
              </dd>
            </div>
          )}
          {lastRun && (
            <div>
              <dt>Last run</dt>
              <dd>{formatRunTime(lastRun.startedAt)} · {lastRun.kind.toLowerCase()}</dd>
            </div>
          )}
          <div>
            <dt>Next run</dt>
            <dd>None — schedule is off</dd>
          </div>
        </dl>
      </CollapsibleSection>

      <AgentDutiesBox duties={agent.duties} onSave={onSaveDuties} />
      <AgentAssignmentsBox assignments={agent.assignments} blockedIds={blockedAssignmentIds(agent)} onSave={onSaveAssignments} />
      <AgentIssuersBox agent={agent} store={store} />
      <AgentScheduleBox schedule={agent.schedule} onSave={onSaveSchedule} />

      <CollapsibleSection title="Permissions & delivery">
        <div className="field-group-row field-group-row--two-col">
          <div>
            <h4 className="property-details-title">Can</h4>
            <ul className="agents-reasons">{agent.canDo.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div>
            <h4 className="property-details-title">Cannot</h4>
            <ul className="agents-reasons">{agent.cannotDo.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </div>
        <dl className="agents-dl">
          <div>
            <dt>Delivery</dt>
            <dd>{CONNECTION_LABEL[agent.connection]}</dd>
          </div>
        </dl>
      </CollapsibleSection>
    </div>
  )
}
