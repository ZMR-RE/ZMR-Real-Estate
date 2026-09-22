import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import type { PickListOption } from '../../shared/pickLists/pickListsQueries'
import type { StatusFilter } from './useActionQueueFilters'

interface ActionQueueFiltersProps {
  propertyOptions: SearchableSelectOption[]
  propertyFilter: string | null
  onPropertyFilterChange: (id: string | null) => void
  typeOptions: PickListOption[]
  typeFilter: string | null
  onTypeFilterChange: (value: string | null) => void
  statusFilter: StatusFilter
  onStatusFilterChange: (value: StatusFilter) => void
  memberOptions: SearchableSelectOption[]
  assigneeFilter: string | null
  onAssigneeFilterChange: (id: string | null) => void
  searchQuery: string
  onSearchQueryChange: (value: string) => void
}

// Roadmap 10.5 — one filter row (Property, Type, Status, Assignee,
// search), same boxed flex-wrap shape as every other filter bar in this
// app (capture-history-filter-bar, property-specs-filter-bar — kept as
// its own class rather than reused directly, same "different module"
// reasoning as those). Plain <select> throughout (not SearchableSelect)
// so every filter has a built-in "All …" option to clear back to,
// matching Quick Capture History's filter-row convention rather than
// needing a separate "Clear filter" button per control. Status defaults
// to "Open" (set by the hook), so this row is also where roadmap 10.5's
// "completed items hidden by default, a filter reveals them" lives — no
// separate toggle control.
export function ActionQueueFilters({
  propertyOptions,
  propertyFilter,
  onPropertyFilterChange,
  typeOptions,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  memberOptions,
  assigneeFilter,
  onAssigneeFilterChange,
  searchQuery,
  onSearchQueryChange,
}: ActionQueueFiltersProps) {
  return (
    <div className="action-queue-filter-bar">
      <div className="action-queue-filter">
        <label htmlFor="action_queue_property_filter">Property</label>
        <select
          id="action_queue_property_filter"
          value={propertyFilter ?? ''}
          onChange={(e) => onPropertyFilterChange(e.target.value || null)}
        >
          <option value="">All properties</option>
          {propertyOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="action-queue-filter">
        <label htmlFor="action_queue_type_filter">Type</label>
        <select
          id="action_queue_type_filter"
          value={typeFilter ?? ''}
          onChange={(e) => onTypeFilterChange(e.target.value || null)}
        >
          <option value="">All types</option>
          {typeOptions.map((option) => (
            <option key={option.id} value={option.value}>
              {option.value}
            </option>
          ))}
        </select>
      </div>

      <div className="action-queue-filter">
        <label htmlFor="action_queue_status_filter">Status</label>
        <select
          id="action_queue_status_filter"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
        >
          <option value="open">Open</option>
          <option value="completed">Completed</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="action-queue-filter">
        <label htmlFor="action_queue_assignee_filter">Assignee</label>
        <select
          id="action_queue_assignee_filter"
          value={assigneeFilter ?? ''}
          onChange={(e) => onAssigneeFilterChange(e.target.value || null)}
        >
          <option value="">All assignees</option>
          {memberOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="action-queue-filter">
        <label htmlFor="action_queue_search">Search</label>
        <input
          id="action_queue_search"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Search title or notes…"
        />
      </div>
    </div>
  )
}
