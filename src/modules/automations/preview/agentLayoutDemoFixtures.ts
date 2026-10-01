import { buildPopulatedAgents } from './agentFixtures'
import { buildRecordStore, invoice } from './agentRecordFixtures'
import type { Agent, AgentArea, AgentStatus, RecordStore } from './agentTypes'

// LAYOUT TEST ROWS ONLY — not proposed agents. The owner's directory holds
// one rent-cycle specialist; these 59 generic rows exist solely so reviewers
// can see priority ordering, soft-red / light-yellow rows, the total count
// and 25/50/100 pagination behave with a realistic volume.

const AREAS: AgentArea[] = ['Rent ops', 'Financials', 'Quick capture']
const STATUSES: AgentStatus[] = ['active', 'training', 'paused']

export function buildLayoutDemo(): { agents: Agent[]; store: RecordStore } {
  const [assistant] = buildPopulatedAgents()
  const store = buildRecordStore()
  const rows: Agent[] = []
  for (let n = 1; n <= 59; n += 1) {
    const label = String(n).padStart(2, '0')
    const failing = n % 9 === 0
    const reviewing = !failing && n % 4 === 0
    const assignmentId = `layout-asg-${label}`
    rows.push({
      ...assistant,
      id: `layout-${label}`,
      name: `Layout test row ${label}`,
      purpose: 'Fictional row for testing ordering and pagination only — not a proposed agent.',
      area: AREAS[n % AREAS.length],
      status: STATUSES[n % STATUSES.length],
      duties: assistant.duties.map((d) => ({ ...d, enabled: false })),
      assignments: [{ ...assistant.assignments[0], id: assignmentId, tenantName: `Layout tenant ${label}` }],
      checks: [],
      runs: failing
        ? [{ id: `layout-run-${label}`, startedAt: '2026-10-29T09:00:00', kind: 'Practice', outcome: 'failed', draftsCreated: 0, blocked: 0, durationSeconds: 1, notes: ['Fictional failed run for layout testing.'] }]
        : [],
    })
    if (reviewing) {
      store.invoices.push(invoice({ id: `layout-inv-${label}`, assignmentId, issuerEntityId: null, periodLabel: 'November 2026', periodKey: '2026-11', amountDue: 100, dueDate: null }))
    }
  }
  return { agents: [assistant, ...rows], store }
}
