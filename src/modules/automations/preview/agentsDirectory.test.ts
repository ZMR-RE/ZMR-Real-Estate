import { describe, expect, it } from 'vitest'
import { EMPTY_FILTERS, filterAgents } from './agentDirectoryFilter'
import { pageContaining, paginate, sortByPriority } from './agentDirectoryPaging'
import { buildFailedRunAgents, buildPopulatedAgents } from './agentFixtures'
import { deriveHealth, HEALTH_ROW_CLASS } from './agentHealth'
import { buildLayoutDemo } from './agentLayoutDemoFixtures'
import { dismissNotice } from './agentPayments'
import { decideInvoice, decideReceipt, decideReminder } from './agentRecordEdits'
import { buildRecordStore } from './agentRecordFixtures'
import type { RecordStore } from './agentTypes'

const TODAY = '2026-10-30'
const assistant = () => buildPopulatedAgents()[0]

// Clears every review item so only the colour rule under test remains.
function clearedStore(): RecordStore {
  let s = buildRecordStore()
  for (const i of s.invoices) if (i.state === 'draft' || i.state === 'approved') s = decideInvoice(s, i.id, 'reject')
  for (const r of s.receipts) if (r.state === 'draft') s = decideReceipt(s, r.id, 'reject')
  for (const r of s.reminders) s = decideReminder(s, r.id, 'rejected')
  for (const n of s.notices) s = dismissNotice(s, n.id)
  return s
}

describe('directory contents', () => {
  it('holds exactly one rent-cycle specialist with four assignments and no unconfigured examples', () => {
    const agents = buildPopulatedAgents()
    expect(agents).toHaveLength(1)
    expect(agents[0].name).toBe('Rent & Payments Assistant')
    expect(agents[0].assignments).toHaveLength(4)
  })

  it('never has an enabled schedule or delivery duty', () => {
    const a = assistant()
    expect(a.schedule.enabled).toBe(false)
    expect(a.duties.find((d) => d.id === 'delivery')?.enabled).toBe(false)
  })
})

describe('row colour (owner decision)', () => {
  it('is light yellow when approvals, notices or conflicts need review', () => {
    const h = deriveHealth(assistant(), buildRecordStore(), TODAY)
    expect(h.health).toBe('attention')
    expect(HEALTH_ROW_CLASS[h.health]).toBe('agents-row--review')
    expect(h.reasons.join(' ')).toMatch(/changed while the assistant was working/)
  })

  it('stays yellow for a tenant failing a check even with nothing else to review', () => {
    expect(deriveHealth(assistant(), clearedStore(), TODAY).health).toBe('attention')
  })

  it('is soft red when the last run failed, and keeps the review reasons', () => {
    const h = deriveHealth(buildFailedRunAgents()[0], buildRecordStore(), TODAY)
    expect(h.health).toBe('blocked')
    expect(HEALTH_ROW_CLASS[h.health]).toBe('agents-row--problem')
    expect(h.reasons.length).toBeGreaterThan(1)
  })

  it('is soft red when disconnected or a review is overdue', () => {
    expect(deriveHealth({ ...assistant(), connection: 'disconnected' }, buildRecordStore(), TODAY).health).toBe('blocked')
    const s = buildRecordStore()
    s.reminders[0].reviewBy = '2026-10-29'
    expect(deriveHealth(assistant(), s, TODAY).health).toBe('blocked')
  })

  it('is neutral when idle with nothing to review', () => {
    const h = deriveHealth({ ...assistant(), checks: [] }, clearedStore(), TODAY)
    expect(HEALTH_ROW_CLASS[h.health]).toBe('')
  })
})

describe('priority ordering and pagination', () => {
  const { agents, store } = buildLayoutDemo()
  const ordered = sortByPriority(agents, store, TODAY)

  it('orders red, then yellow, then the rest before paging', () => {
    const tiers = ordered.map((a) => deriveHealth(a, store, TODAY).health)
    const rank = { blocked: 0, attention: 1, healthy: 2, inactive: 3 }
    for (let i = 1; i < tiers.length; i += 1) expect(rank[tiers[i]]).toBeGreaterThanOrEqual(rank[tiers[i - 1]])
    expect(tiers[0]).toBe('blocked')
  })

  it('pages 25/50/100 with a total count', () => {
    expect(paginate(ordered, 1, 25)).toMatchObject({ pageCount: 3, firstIndex: 1, lastIndex: 25, total: 60 })
    expect(paginate(ordered, 3, 25)).toMatchObject({ firstIndex: 51, lastIndex: 60 })
    expect(paginate(ordered, 9, 50).page).toBe(2)
    expect(paginate(ordered, 1, 100).items).toHaveLength(60)
  })

  it('finds the page holding the selected agent', () => {
    const last = ordered[ordered.length - 1]
    expect(pageContaining(ordered, last.id, 25)).toBe(3)
    expect(pageContaining(ordered, 'missing', 25)).toBeNull()
  })

  it('filters by tenant or unit', () => {
    const agents1 = buildPopulatedAgents()
    const store1 = buildRecordStore()
    expect(filterAgents(agents1, { ...EMPTY_FILTERS, query: 'Sample Road' }, store1, TODAY)).toHaveLength(1)
    expect(filterAgents(agents1, { ...EMPTY_FILTERS, health: 'blocked' }, store1, TODAY)).toHaveLength(0)
  })
})
