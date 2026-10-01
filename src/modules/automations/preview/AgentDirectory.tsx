import { EMPTY_FILTERS, hasActiveFilters, STATUS_LABEL, type DirectoryFilters } from './agentDirectoryFilter'
import { PAGE_SIZES, type Page, type PageSize } from './agentDirectoryPaging'
import { deriveHealth, HEALTH_BADGE, HEALTH_LABEL, HEALTH_ROW_CLASS } from './agentHealth'
import { totalToReview } from './agentRecords'
import type { Agent, AgentArea, AgentHealth, AgentStatus, RecordStore } from './agentTypes'

interface AgentDirectoryProps {
  totalAgents: number
  page: Page<Agent>
  pageSize: PageSize
  onPageSizeChange: (size: PageSize) => void
  onPageChange: (page: number) => void
  filters: DirectoryFilters
  onFiltersChange: (next: DirectoryFilters) => void
  selectedId: string | null
  selectedName: string | null
  selectedPlacement: 'none' | 'here' | 'elsewhere' | 'filtered'
  onShowSelected: () => void
  onSelect: (id: string) => void
  store: RecordStore
  today: string
}

const STATUSES: AgentStatus[] = ['active', 'training', 'paused']
const HEALTHS: AgentHealth[] = ['blocked', 'attention', 'healthy', 'inactive']
const AREAS: AgentArea[] = ['Rent ops', 'Financials', 'Quick capture']

function rowSummary(agent: Agent, store: RecordStore): string {
  const parts = [STATUS_LABEL[agent.status]]
  if (agent.assignments.length > 0) parts.push(`${agent.assignments.length} ${agent.assignments.length === 1 ? 'tenant' : 'tenants'}`)
  const waiting = totalToReview(agent, store)
  if (waiting > 0) parts.push(`${waiting} to review`)
  return parts.join(' · ')
}

export function AgentDirectory(props: AgentDirectoryProps) {
  const { totalAgents, page, pageSize, filters, onFiltersChange, selectedId, store, today } = props
  const set = <K extends keyof DirectoryFilters>(key: K, value: DirectoryFilters[K]) => onFiltersChange({ ...filters, [key]: value })
  const filtered = hasActiveFilters(filters)

  return (
    <section className="agents-directory" aria-label="Agent directory">
      <div className="agents-filters">
        <input type="search" value={filters.query} onChange={(e) => set('query', e.target.value)} placeholder="Search agents, tenants, units" aria-label="Search agents, tenants or units" />
        <div className="agents-filter-selects">
          <select aria-label="Filter by status" value={filters.status} onChange={(e) => set('status', e.target.value as DirectoryFilters['status'])}>
            <option value="all">Status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <select aria-label="Filter by health" value={filters.health} onChange={(e) => set('health', e.target.value as DirectoryFilters['health'])}>
            <option value="all">Health</option>
            {HEALTHS.map((h) => <option key={h} value={h}>{HEALTH_LABEL[h]}</option>)}
          </select>
          <select aria-label="Filter by area" value={filters.area} onChange={(e) => set('area', e.target.value as DirectoryFilters['area'])}>
            <option value="all">Area</option>
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="agents-directory-count">
          <span aria-live="polite">
            {filtered ? `${page.total} of ${totalAgents} agents` : `${totalAgents} ${totalAgents === 1 ? 'agent' : 'agents'}`}
            {page.total > 0 && page.pageCount > 1 && ` · showing ${page.firstIndex}–${page.lastIndex}`}
          </span>
          {filtered && (
            <button type="button" className="agents-link-button" onClick={() => onFiltersChange(EMPTY_FILTERS)}>Clear filters</button>
          )}
        </div>
      </div>

      {props.selectedPlacement === 'elsewhere' || props.selectedPlacement === 'filtered' ? (
        <p className="agents-selected-note">
          Selected: <strong>{props.selectedName}</strong> {props.selectedPlacement === 'filtered' ? '(hidden by filters)' : '(on another page)'}
          <button type="button" className="agents-link-button" onClick={props.onShowSelected}>Show selected</button>
        </p>
      ) : null}

      {totalAgents === 0 ? (
        <p className="empty-state">No agents yet.</p>
      ) : page.total === 0 ? (
        <p className="empty-state">No agents match these filters.</p>
      ) : (
        <ul className="agents-list" aria-label="Agents, most urgent first">
          {page.items.map((agent) => {
            const { health } = deriveHealth(agent, store, today)
            const selected = agent.id === selectedId
            return (
              <li key={agent.id}>
                <button
                  type="button"
                  className={['agents-row', HEALTH_ROW_CLASS[health], selected ? 'agents-row--selected' : ''].filter(Boolean).join(' ')}
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => props.onSelect(agent.id)}
                >
                  <span className="agents-row-main">
                    <span className="agents-row-name">{agent.name}</span>
                    <span className="agents-row-meta">{rowSummary(agent, store)}</span>
                  </span>
                  {/* Text cue alongside the row tint, so the alert never relies on colour alone. */}
                  {(health === 'attention' || health === 'blocked') && (
                    <span className={`status-badge ${HEALTH_BADGE[health]}`}>{HEALTH_LABEL[health]}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {page.total > 0 && (
        <nav className="agents-pager" aria-label="Directory pages">
          <label className="agents-page-size">
            Rows per page
            <select value={pageSize} onChange={(e) => props.onPageSizeChange(Number(e.target.value) as PageSize)}>
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <span className="agents-pager-controls">
            <button type="button" className="agents-compact-button" disabled={page.page <= 1} onClick={() => props.onPageChange(page.page - 1)}>Previous</button>
            <span className="agents-row-meta">Page {page.page} of {page.pageCount}</span>
            <button type="button" className="agents-compact-button" disabled={page.page >= page.pageCount} onClick={() => props.onPageChange(page.page + 1)}>Next</button>
          </span>
        </nav>
      )}
    </section>
  )
}
