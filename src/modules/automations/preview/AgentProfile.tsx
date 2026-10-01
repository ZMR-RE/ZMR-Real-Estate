import { useState } from 'react'
import { AgentApprovalsTab, type ApprovalActions } from './AgentApprovalsTab'
import { AgentChecksTab } from './AgentChecksTab'
import { STATUS_LABEL } from './agentDirectoryFilter'
import { deriveHealth, HEALTH_BADGE, HEALTH_LABEL } from './agentHealth'
import { AgentOverviewTab } from './AgentOverviewTab'
import { totalToReview } from './agentRecords'
import { AgentRequiredInfoTab } from './AgentRequiredInfoTab'
import { AgentRunsTab } from './AgentRunsTab'
import type { Agent, AgentDuty, AgentSchedule, RecordStore, TenantAssignment } from './agentTypes'
import { AgentWorkloadTab } from './AgentWorkloadTab'

type ProfileTab = 'overview' | 'workload' | 'approvals' | 'required' | 'checks' | 'runs'

interface AgentProfileProps {
  agent: Agent
  store: RecordStore
  today: string
  actions: ApprovalActions & {
    runPractice: () => void
    reviseInvoice: (id: string) => void
    cancelInvoice: (id: string) => void
    saveAssignments: (next: TenantAssignment[]) => void
    saveDuties: (next: AgentDuty[]) => void
    saveSchedule: (next: AgentSchedule) => void
  }
  onBack: () => void
}

export function AgentProfile({ agent, store, today, actions, onBack }: AgentProfileProps) {
  const [tab, setTab] = useState<ProfileTab>('overview')
  const health = deriveHealth(agent, store, today)
  const toReview = totalToReview(agent, store)

  const tabs: { id: ProfileTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'workload', label: 'Workload' },
    { id: 'approvals', label: toReview > 0 ? `Approvals (${toReview})` : 'Approvals' },
    { id: 'required', label: 'Required information' },
    { id: 'checks', label: 'Checks & training' },
    { id: 'runs', label: 'Run history' },
  ]

  return (
    <section className="agents-profile" aria-label={`${agent.name} profile`}>
      <button type="button" className="agents-back agents-compact-button" onClick={onBack}>← All agents</button>
      <div className="agents-profile-header">
        <div className="agents-profile-title">
          <h2>{agent.name}</h2>
          <p>{agent.purpose}</p>
          <p className="agents-profile-badges">
            <span className="status-badge status-badge-neutral">{STATUS_LABEL[agent.status]}</span>
            <span className={`status-badge ${HEALTH_BADGE[health.health]}`}>{HEALTH_LABEL[health.health]}</span>
          </p>
        </div>
        <div className="agents-profile-actions">
          <button type="button" className="agents-compact-button" disabled={agent.activeRunId !== null} onClick={actions.runPractice}>
            {agent.activeRunId ? 'Run in progress…' : 'Run practice draft'}
          </button>
          <button type="button" className="agents-compact-button" disabled aria-describedby="agent-activate-hint">Activate</button>
          <p id="agent-activate-hint" className="field-hint">Activation isn’t available in this preview.</p>
        </div>
      </div>

      <div className="tab-bar" role="tablist" aria-label="Agent sections">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'overview' && (
          <AgentOverviewTab
            agent={agent}
            store={store}
            health={health}
            onSaveAssignments={actions.saveAssignments}
            onSaveDuties={actions.saveDuties}
            onSaveSchedule={actions.saveSchedule}
          />
        )}
        {tab === 'workload' && <AgentWorkloadTab agent={agent} store={store} today={today} onRevise={actions.reviseInvoice} onCancel={actions.cancelInvoice} />}
        {tab === 'approvals' && <AgentApprovalsTab agent={agent} store={store} actions={actions} />}
        {tab === 'required' && <AgentRequiredInfoTab agent={agent} />}
        {tab === 'checks' && <AgentChecksTab agent={agent} />}
        {tab === 'runs' && <AgentRunsTab runs={agent.runs} />}
      </div>
    </section>
  )
}
