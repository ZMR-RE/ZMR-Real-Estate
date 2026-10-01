import { blockedAssignmentIds } from './agentHealth'
import { invoice } from './agentRecordFixtures'
import type { Agent, AgentDuty, AgentRun, AgentSchedule, InvoiceRecord, RecordStore, TenantAssignment } from './agentTypes'

// Pure, in-memory transitions on the agent itself for the NON-SAVING
// preview. Records (invoices, payments, receipts) are never held on the
// agent — see agentRecordEdits.ts / agentPayments.ts.

export function replaceAssignments(agent: Agent, assignments: TenantAssignment[]): Agent {
  // Records for a removed tenant stay in Rent ops untouched; they simply
  // leave this agent's Workload view.
  return { ...agent, assignments }
}

// Duties that aren't built (delivery) can never be switched on.
export function replaceDuties(agent: Agent, duties: AgentDuty[]): Agent {
  return { ...agent, duties: duties.map((d) => (d.availability === 'not_built' ? { ...d, enabled: false } : d)) }
}

export function replaceSchedule(agent: Agent, schedule: AgentSchedule): Agent {
  return { ...agent, schedule: { ...schedule, enabled: false } }
}

// One run at a time per agent. The built feature takes this lock in the
// database (a run row with a uniqueness guard on the agent's active run), so
// a double-click, a schedule firing during a manual run, or two browser tabs
// can't start overlapping runs.
export function acquireRunLock(agent: Agent, runId: string): Agent | null {
  return agent.activeRunId === null ? { ...agent, activeRunId: runId } : null
}

// Simulates one practice run: for each active assignment that passes its
// checks, create ONE draft invoice record in the shared store — skipped when
// any non-rejected invoice already exists for that tenant and month.
export function simulatePracticeRun(agent: Agent, store: RecordStore, now: Date, periodKey: string, periodLabel: string): { agent: Agent; store: RecordStore } {
  if (!agent.duties.some((d) => d.id === 'invoices' && d.enabled)) return { agent, store }
  if (!acquireRunLock(agent, `run-local-${now.getTime()}`)) return { agent, store }
  const blocked = blockedAssignmentIds(agent)
  const runId = `run-local-${now.getTime()}`
  const created: InvoiceRecord[] = []
  const notes: string[] = []
  let blockedCount = 0

  for (const a of agent.assignments) {
    if (a.paused) continue
    if (blocked.has(a.id) || a.monthlyRent === null) {
      blockedCount += 1
      notes.push(`${a.tenantName} skipped: fails a check.`)
      continue
    }
    if (store.invoices.some((i) => i.assignmentId === a.id && i.periodKey === periodKey && i.state !== 'rejected')) {
      notes.push(`${a.tenantName} skipped: an invoice for ${periodLabel} already exists.`)
      continue
    }
    created.push(
      invoice({ id: `inv-${a.id}-${periodKey}`, assignmentId: a.id, issuerEntityId: a.issuerEntityId, periodLabel, periodKey, amountDue: a.monthlyRent, dueDate: null, createdBy: 'assistant', runId, recipientName: a.tenantName, recipientEmail: a.billingEmail }),
    )
  }
  if (created.length > 0) notes.unshift(`Drafted ${periodLabel} invoices for ${created.length} ${created.length === 1 ? 'tenant' : 'tenants'}.`)

  const run: AgentRun = {
    id: runId,
    startedAt: now.toISOString(),
    kind: 'Practice',
    outcome: blockedCount > 0 ? 'completed_with_blocks' : 'completed',
    draftsCreated: created.length,
    blocked: blockedCount,
    durationSeconds: 1,
    notes,
  }
  // The simulated run finishes synchronously, so the lock is released here.
  return { agent: { ...agent, activeRunId: null, runs: [run, ...agent.runs] }, store: { ...store, invoices: [...store.invoices, ...created] } }
}
