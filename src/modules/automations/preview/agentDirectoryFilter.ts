import { deriveHealth } from './agentHealth'
import type { Agent, AgentArea, AgentHealth, AgentStatus, RecordStore } from './agentTypes'

export interface DirectoryFilters {
  query: string
  status: AgentStatus | 'all'
  health: AgentHealth | 'all'
  area: AgentArea | 'all'
}

export const EMPTY_FILTERS: DirectoryFilters = { query: '', status: 'all', health: 'all', area: 'all' }

export const STATUS_LABEL: Record<AgentStatus, string> = {
  training: 'Training',
  active: 'Active',
  paused: 'Paused',
}

// Search covers what an owner would actually type: the agent's name or
// purpose, or a tenant/unit it serves ("which agent bills Unit 2?").
function matchesQuery(agent: Agent, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    agent.name,
    agent.purpose,
    agent.area,
    ...agent.assignments.flatMap((a) => [a.tenantName, a.unitLabel]),
  ]
  return haystack.some((text) => text.toLowerCase().includes(q))
}

export function filterAgents(agents: Agent[], filters: DirectoryFilters, store: RecordStore, today: string): Agent[] {
  return agents.filter(
    (agent) =>
      matchesQuery(agent, filters.query) &&
      (filters.status === 'all' || agent.status === filters.status) &&
      (filters.area === 'all' || agent.area === filters.area) &&
      (filters.health === 'all' || deriveHealth(agent, store, today).health === filters.health),
  )
}

export function hasActiveFilters(filters: DirectoryFilters): boolean {
  return (
    filters.query.trim() !== '' || filters.status !== 'all' || filters.health !== 'all' || filters.area !== 'all'
  )
}
