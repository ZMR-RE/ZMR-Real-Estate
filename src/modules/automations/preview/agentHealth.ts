import { overdueReviewCount, reviewCounts } from './agentRecords'
import type { Agent, AgentHealth, RecordStore, TenantAssignment } from './agentTypes'

// Health is derived, never stored: it summarizes the agent's own checks and
// runs plus the shared records in its workload, so the directory, profile,
// Workload and Approvals can't disagree.
//
// Owner colour decision (September 30, 2026): the whole directory row is
// softly red for failures, disconnection or overdue work; light yellow when
// human approval/review is needed; otherwise neutral. Ordinary drafting or
// idle time is never an alert. Red outranks yellow.

export interface HealthSummary {
  health: AgentHealth
  reasons: string[]
}

export function blockedAssignmentIds(agent: Agent): Set<string> {
  const ids = new Set<string>()
  for (const check of agent.checks) {
    for (const r of check.results) {
      if (r.result === 'fail' && r.assignmentId) ids.add(r.assignmentId)
    }
  }
  return ids
}

export function activeAssignments(agent: Agent): TenantAssignment[] {
  return agent.assignments.filter((a) => !a.paused)
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

export function deriveHealth(agent: Agent, store: RecordStore, today: string): HealthSummary {
  const failures: string[] = []
  if (agent.runs[0]?.outcome === 'failed') failures.push('Last run failed')
  if (agent.connection === 'disconnected') failures.push('Connection lost')
  const overdue = overdueReviewCount(agent, store, today)
  if (overdue > 0) failures.push(`${plural(overdue, 'review is', 'reviews are')} overdue`)

  const c = reviewCounts(agent, store)
  const reviews: string[] = []
  if (c.conflicts > 0) reviews.push(`${plural(c.conflicts, 'record changed', 'records changed')} while the assistant was working`)
  const docs = c.invoices + c.receipts + c.reminders
  if (docs > 0) reviews.push(`${plural(docs, 'draft awaits', 'drafts await')} approval or issue`)
  if (c.notices > 0) reviews.push(`${plural(c.notices, 'payment notice needs', 'payment notices need')} review`)
  const blocked = blockedAssignmentIds(agent)
  const blockedActive = activeAssignments(agent).filter((a) => blocked.has(a.id)).length
  if (blockedActive > 0) reviews.push(`${plural(blockedActive, 'tenant needs', 'tenants need')} a fix before drafting`)

  // Red outranks yellow, but the reasons list keeps both so nothing is hidden.
  if (failures.length > 0) return { health: 'blocked', reasons: [...failures, ...reviews] }
  if (reviews.length > 0) return { health: 'attention', reasons: reviews }
  if (agent.status === 'paused') return { health: 'inactive', reasons: [] }
  return { health: 'healthy', reasons: [] }
}

export const HEALTH_LABEL: Record<AgentHealth, string> = {
  healthy: 'No action needed',
  attention: 'Needs review',
  blocked: 'Problem',
  inactive: 'Not active',
}

export const HEALTH_BADGE: Record<AgentHealth, string> = {
  healthy: 'status-badge-neutral',
  attention: 'status-badge-warning',
  blocked: 'status-badge-danger',
  inactive: 'status-badge-neutral',
}

// Row background: only the two alert states tint; everything else neutral.
export const HEALTH_ROW_CLASS: Record<AgentHealth, string> = {
  healthy: '',
  attention: 'agents-row--review',
  blocked: 'agents-row--problem',
  inactive: '',
}
