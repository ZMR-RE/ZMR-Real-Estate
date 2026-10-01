import { deriveHealth } from './agentHealth'
import { totalToReview } from './agentRecords'
import type { Agent, AgentHealth, RecordStore } from './agentTypes'

// Directory order is decided BEFORE pagination, so page 1 always holds the
// most urgent agents: problems (soft red) first, then review needed (light
// yellow), then everything else. Within a tier, more waiting items first,
// then name — deterministic, so rows don't shuffle between renders.

export const PAGE_SIZES = [25, 50, 100] as const
export type PageSize = (typeof PAGE_SIZES)[number]

const TIER: Record<AgentHealth, number> = { blocked: 0, attention: 1, healthy: 2, inactive: 3 }

export function sortByPriority(agents: Agent[], store: RecordStore, today: string): Agent[] {
  const keyed = agents.map((agent) => ({
    agent,
    tier: TIER[deriveHealth(agent, store, today).health],
    waiting: totalToReview(agent, store),
  }))
  keyed.sort((a, b) => a.tier - b.tier || b.waiting - a.waiting || a.agent.name.localeCompare(b.agent.name))
  return keyed.map((k) => k.agent)
}

export interface Page<T> {
  items: T[]
  page: number
  pageCount: number
  firstIndex: number
  lastIndex: number
  total: number
}

export function paginate<T>(items: T[], page: number, size: number): Page<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / size))
  const current = Math.min(Math.max(1, page), pageCount)
  const start = (current - 1) * size
  const pageItems = items.slice(start, start + size)
  return {
    items: pageItems,
    page: current,
    pageCount,
    firstIndex: pageItems.length ? start + 1 : 0,
    lastIndex: start + pageItems.length,
    total: items.length,
  }
}

export function pageContaining<T extends { id: string }>(items: T[], id: string, size: number): number | null {
  const index = items.findIndex((i) => i.id === id)
  return index === -1 ? null : Math.floor(index / size) + 1
}
