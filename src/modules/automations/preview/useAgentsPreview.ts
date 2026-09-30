import { useMemo, useState } from 'react'
import { EMPTY_FILTERS, filterAgents, type DirectoryFilters } from './agentDirectoryFilter'
import { pageContaining, paginate, sortByPriority, type PageSize } from './agentDirectoryPaging'
import { buildFailedRunAgents, buildPopulatedAgents } from './agentFixtures'
import { buildLayoutDemo } from './agentLayoutDemoFixtures'
import { dismissNotice, linkNoticeToPayment, matchNotice, recordNoticeAsPayment } from './agentPayments'
import { replaceAssignments, replaceDuties, replaceSchedule, simulatePracticeRun } from './agentPreviewActions'
import { buildRecordStore } from './agentRecordFixtures'
import { cancelInvoice, decideInvoice, decideReceipt, decideReminder, editInvoice, issueInvoice, issueReceipt, reviseInvoice, type InvoiceEdit } from './agentRecordEdits'
import type { Agent, AgentDuty, AgentSchedule, ApprovalState, PaymentAllocation, RecordStore, TenantAssignment } from './agentTypes'

export type PreviewDataset = 'populated' | 'failed' | 'layout' | 'empty'

const EMPTY_STORE: RecordStore = { entities: [], invoices: [], payments: [], receipts: [], reminders: [], notices: [] }

const BUILDERS: Record<PreviewDataset, () => { agents: Agent[]; store: RecordStore }> = {
  populated: () => ({ agents: buildPopulatedAgents(), store: buildRecordStore() }),
  failed: () => ({ agents: buildFailedRunAgents(), store: buildRecordStore() }),
  layout: buildLayoutDemo,
  empty: () => ({ agents: [], store: EMPTY_STORE }),
}

// Fixed preview date/time so fictional due dates, review deadlines and
// issue timestamps behave the same for every reviewer.
export const PREVIEW_TODAY = '2026-10-30'
const PREVIEW_NOW = '2026-10-30T10:00:00'

// Business-logic hook for the NON-SAVING Agents preview. `store` is the one
// account record store (Rent ops' invoices/payments/receipts); agents only
// reference it. A reload restores the original fixtures.
//
// Selection stability: the selected agent is tracked by id only. Filtering,
// re-sorting (e.g. after approvals change its priority) and paging never
// change or clear it; the directory offers "Show selected" when the row
// isn't on the current page.
export function useAgentsPreview() {
  const [dataset, setDataset] = useState<PreviewDataset>('populated')
  const [agents, setAgents] = useState<Agent[]>(() => BUILDERS.populated().agents)
  const [store, setStore] = useState<RecordStore>(() => BUILDERS.populated().store)
  const [filters, setFiltersState] = useState<DirectoryFilters>(EMPTY_FILTERS)
  const [pageSize, setPageSizeState] = useState<PageSize>(25)
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>('agent-rent-payments')
  const [mobilePane, setMobilePane] = useState<'directory' | 'profile'>('directory')

  const ordered = useMemo(() => sortByPriority(filterAgents(agents, filters, store, PREVIEW_TODAY), store, PREVIEW_TODAY), [agents, filters, store])
  const current = paginate(ordered, page, pageSize)
  const selectedAgent = agents.find((a) => a.id === selectedId) ?? null
  const selectedPage = selectedId ? pageContaining(ordered, selectedId, pageSize) : null
  const unitOf = (assignmentId: string) => agents.flatMap((a) => a.assignments).find((x) => x.id === assignmentId)?.unitLabel ?? 'Unit'

  const switchDataset = (next: PreviewDataset) => {
    const built = BUILDERS[next]()
    setDataset(next)
    setAgents(built.agents)
    setStore(built.store)
    setFiltersState(EMPTY_FILTERS)
    setPage(1)
    setSelectedId(built.agents[0]?.id ?? null)
    setMobilePane('directory')
  }

  const updateSelected = (change: (agent: Agent) => Agent) => {
    if (!selectedId) return
    setAgents((all) => all.map((a) => (a.id === selectedId ? change(a) : a)))
  }

  return {
    dataset,
    switchDataset,
    store,
    totalAgents: agents.length,
    page: current,
    pageSize,
    setPageSize: (size: PageSize) => {
      setPageSizeState(size)
      setPage(1)
    },
    goToPage: setPage,
    filters,
    setFilters: (next: DirectoryFilters) => {
      setFiltersState(next)
      setPage(1)
    },
    selectedAgent,
    selectedPlacement: (!selectedAgent ? 'none' : selectedPage === null ? 'filtered' : selectedPage === current.page ? 'here' : 'elsewhere') as 'none' | 'here' | 'elsewhere' | 'filtered',
    showSelected: () => {
      if (selectedPage !== null) return setPage(selectedPage)
      setFiltersState(EMPTY_FILTERS)
      const all = sortByPriority(agents, store, PREVIEW_TODAY)
      setPage(selectedId ? (pageContaining(all, selectedId, pageSize) ?? 1) : 1)
    },
    selectAgent: (id: string) => {
      setSelectedId(id)
      setMobilePane('profile')
    },
    mobilePane,
    showDirectory: () => setMobilePane('directory'),
    saveAssignments: (next: TenantAssignment[]) => updateSelected((a) => replaceAssignments(a, next)),
    saveDuties: (next: AgentDuty[]) => updateSelected((a) => replaceDuties(a, next)),
    saveSchedule: (next: AgentSchedule) => updateSelected((a) => replaceSchedule(a, next)),
    runPractice: () => {
      if (!selectedAgent) return
      const result = simulatePracticeRun(selectedAgent, store, new Date(PREVIEW_NOW), '2026-12', 'December 2026')
      setAgents((all) => all.map((a) => (a.id === result.agent.id ? result.agent : a)))
      setStore(result.store)
    },
    // Record actions — all operate on the shared store.
    editInvoice: (id: string, edit: InvoiceEdit) => setStore((s) => editInvoice(s, id, edit)),
    decideInvoice: (id: string, d: 'approve' | 'reject') => setStore((s) => decideInvoice(s, id, d)),
    decideReceipt: (id: string, d: 'approve' | 'reject') => setStore((s) => decideReceipt(s, id, d)),
    decideReminder: (id: string, state: ApprovalState) => setStore((s) => decideReminder(s, id, state)),
    issueInvoice: (id: string, assignmentId: string) => setStore((s) => issueInvoice(s, id, unitOf(assignmentId), PREVIEW_NOW)),
    issueReceipt: (id: string, assignmentId: string) => setStore((s) => issueReceipt(s, id, unitOf(assignmentId), PREVIEW_NOW)),
    reviseInvoice: (id: string) => setStore((s) => reviseInvoice(s, id)),
    cancelInvoice: (id: string) => setStore((s) => cancelInvoice(s, id)),
    recordNotice: (noticeId: string, allocations: PaymentAllocation[], issuerEntityId: string | null) =>
      setStore((s) => recordNoticeAsPayment(s, noticeId, allocations, issuerEntityId, selectedAgent?.duties.some((d) => d.id === 'receipts' && d.enabled) ?? false)),
    linkNotice: (noticeId: string, paymentId: string) => setStore((s) => linkNoticeToPayment(s, noticeId, paymentId)),
    dismissNotice: (noticeId: string) => setStore((s) => dismissNotice(s, noticeId)),
    matchNotice: (noticeId: string, assignmentId: string | null) => setStore((s) => matchNotice(s, noticeId, assignmentId)),
  }
}

export type AgentsPreviewState = ReturnType<typeof useAgentsPreview>
