import type { Agent, AgentDuty, AgentRun, TenantAssignment } from './agentTypes'

// FICTIONAL PREVIEW DATA ONLY. Every name, address, amount and date here is
// invented for the non-saving Agents preview. Nothing is read from or
// written to any database. The operational directory holds ONE rent-cycle
// specialist serving four tenant assignments — no unconfigured examples.
// Invoices, payments and receipts are NOT held here: they live in the shared
// record store (agentRecordFixtures.ts) that Rent ops also reads.

const ASSIGNMENTS: TenantAssignment[] = [
  { id: 'asg-riley', tenantId: 'demo-tenant-riley', propertyId: 'demo-property-410', tenantName: 'Riley Example', unitLabel: '410 Example Street — Unit 1', leaseLabel: 'Lease Jan 1, 2026 – Dec 31, 2026', monthlyRent: 1450, billingEmail: 'riley@example.com', issuerEntityId: 'ent-example-holdings', ownerNote: 'Owned by Example Holdings LLC (100%)', paused: false },
  { id: 'asg-jordan', tenantId: 'demo-tenant-jordan', propertyId: 'demo-property-410', tenantName: 'Jordan Sample', unitLabel: '410 Example Street — Unit 2', leaseLabel: 'Lease Mar 1, 2026 – Feb 28, 2027', monthlyRent: 1395, billingEmail: 'jordan@example.com', issuerEntityId: 'ent-example-holdings', ownerNote: 'Owned by Example Holdings LLC (100%)', paused: false },
  { id: 'asg-casey', tenantId: 'demo-tenant-casey', propertyId: 'demo-property-27', tenantName: 'Casey Placeholder', unitLabel: '27 Sample Road — Unit A', leaseLabel: 'Lease Aug 1, 2025 – month to month', monthlyRent: 1720, billingEmail: null, issuerEntityId: 'ent-sample-road', ownerNote: 'Owned by Sample Road Properties LLC (100%)', paused: false },
  { id: 'asg-morgan', tenantId: 'demo-tenant-morgan', propertyId: 'demo-property-9', tenantName: 'Morgan Demo', unitLabel: '9 Placeholder Lane — Main', leaseLabel: 'Lease Jun 1, 2026 – May 31, 2027', monthlyRent: null, billingEmail: 'morgan@example.com', issuerEntityId: null, ownerNote: 'Two owners (48% / 52%) — issuer must be chosen', paused: false },
]

// Fictional tenants with active leases the assistant doesn't serve yet —
// the pool the Assignments box's Edit state adds from.
export const UNASSIGNED_TENANTS: TenantAssignment[] = [
  { id: 'asg-avery', tenantId: 'demo-tenant-avery', propertyId: 'demo-property-27', tenantName: 'Avery Fictional', unitLabel: '27 Sample Road — Unit B', leaseLabel: 'Lease Sep 1, 2026 – Aug 31, 2027', monthlyRent: 1510, billingEmail: 'avery@example.com', issuerEntityId: 'ent-sample-road', ownerNote: 'Owned by Sample Road Properties LLC (100%)', paused: false },
]

const DUTIES: AgentDuty[] = [
  { id: 'invoices', label: 'Draft rent invoices', description: 'Monthly invoice per assigned tenant from the active lease’s rent.', enabled: true, availability: 'preview', blockers: ['Rent due day isn’t stored on leases yet'] },
  { id: 'payment_notices', label: 'Review payment notifications', description: 'Matches payment emails to invoices as evidence for you to confirm — never settles or reconciles by itself.', enabled: true, availability: 'preview', blockers: ['No mailbox is connected; samples only'] },
  { id: 'partial_payments', label: 'Track partial payments', description: 'Keeps each payment as its own Rent ops event and shows the remaining balance.', enabled: true, availability: 'preview', blockers: [] },
  { id: 'receipts', label: 'Draft receipts', description: 'Drafts a receipt for each recorded payment event.', enabled: true, availability: 'preview', blockers: ['Receipt format and numbering not decided'] },
  { id: 'reminders', label: 'Draft reminders', description: 'Drafts a reminder when an invoice is unpaid after its due date.', enabled: true, availability: 'preview', blockers: ['Reminder timing / grace period not decided'] },
  { id: 'delivery', label: 'Deliver to tenants', description: 'Sends approved invoices, receipts and reminders.', enabled: false, availability: 'not_built', blockers: ['No sending mailbox; sending isn’t approved'] },
]

const RUNS: AgentRun[] = [
  { id: 'run-3', startedAt: '2026-10-20T09:00:00', kind: 'Practice', outcome: 'completed_with_blocks', draftsCreated: 4, blocked: 1, durationSeconds: 4, notes: ['Drafted November 2026 invoices for Riley Example, Jordan Sample and Casey Placeholder.', 'Morgan Demo skipped: the lease has no rent amount.', 'Drafted a September reminder for Riley Example (unpaid after its Sep 1 due date).', 'Jordan Sample’s November draft changed while this run was working; the assistant’s update was held, not applied over your edit.'] },
  { id: 'run-2', startedAt: '2026-10-13T09:00:00', kind: 'Practice', outcome: 'completed_with_blocks', draftsCreated: 3, blocked: 1, durationSeconds: 5, notes: ['Drafted three practice invoices; owner corrected the note on one.', 'Morgan Demo skipped: the lease has no rent amount.'] },
  { id: 'run-1', startedAt: '2026-10-06T09:00:00', kind: 'Practice', outcome: 'failed', draftsCreated: 0, blocked: 0, durationSeconds: 1, notes: ['Stopped before drafting: lease data could not be read. No partial drafts were kept.'] },
]

function perTenant(id: string, label: string, description: string, overrides: Record<string, { result: 'fail' | 'not_run'; detail: string }> = {}) {
  return {
    id,
    label,
    description,
    results: ASSIGNMENTS.map((a) => (overrides[a.id] ? { assignmentId: a.id, ...overrides[a.id] } : { assignmentId: a.id, result: 'pass' as const })),
  }
}

const RENT_ASSISTANT: Agent = {
  id: 'agent-rent-payments',
  name: 'Rent & Payments Assistant',
  purpose: 'One rent-cycle specialist: invoices, payment-notification review, partial payments, receipts and reminders for assigned tenants. Every output waits for your approval.',
  area: 'Rent ops',
  status: 'training',
  connection: 'not_built',
  activeRunId: null,
  duties: DUTIES,
  assignments: ASSIGNMENTS,
  schedule: { enabled: false, frequency: 'Monthly', draftDayOfMonth: 20, timeZone: 'America/Chicago' },
  checks: [
    perTenant('chk-lease', 'Active lease covers the invoice period', 'The tenant is on a lease that is active for the whole billing month.'),
    perTenant('chk-rent', 'Rent amount is on the lease', 'The amount comes only from the lease’s own rent — never estimated or carried over.', {
      'asg-morgan': { result: 'fail', detail: 'The lease has no rent amount. Add it on the lease; the assistant will not guess one.' },
    }),
    perTenant('chk-duplicate', 'No invoice already exists for this period', 'Prevents a second invoice for the same tenant and month.', {
      'asg-morgan': { result: 'not_run', detail: 'Skipped because an earlier check failed.' },
    }),
    { id: 'chk-payment-dup', label: 'A payment notice isn’t already recorded', description: 'Compares amount, date and payer with recorded payment events before suggesting a new one.', results: [{ assignmentId: null, result: 'pass' }] },
    { id: 'chk-account', label: 'Every record belongs to this account', description: 'Tenant, lease, invoice and property are all in the signed-in account.', results: [{ assignmentId: null, result: 'pass' }] },
  ],
  practiceReview: { reviewed: 6, approvedUnchanged: 5, corrected: 1, rejected: 0 },
  runs: RUNS,
  canDo: [
    'Read assigned tenants’ leases and the account’s Rent ops invoices, payments and receipts',
    'Create draft invoices, receipts and reminders in those same records, for your approval',
    'Suggest how a payment notification matches an invoice',
    'Skip and explain any tenant that fails a check',
  ],
  cannotDo: [
    'Send email or any message to a tenant',
    'Mark an invoice paid or settle it from an email',
    'Record a payment or post to Financials without your confirmation',
    'Change a lease, tenant or rent amount',
    'Run on a schedule until you activate it',
  ],
}

export function buildPopulatedAgents(): Agent[] {
  return [structuredClone(RENT_ASSISTANT)]
}

// Review-only variant: the most recent practice run failed, so the row shows
// the soft-red problem state. Same agent, not a second agent.
export function buildFailedRunAgents(): Agent[] {
  const agents = buildPopulatedAgents()
  agents[0].runs.unshift({
    id: 'run-4',
    startedAt: '2026-10-27T09:00:00',
    kind: 'Practice',
    outcome: 'failed',
    draftsCreated: 0,
    blocked: 0,
    durationSeconds: 1,
    notes: ['Stopped before drafting: lease data could not be read. No partial drafts were kept.'],
  })
  return agents
}
