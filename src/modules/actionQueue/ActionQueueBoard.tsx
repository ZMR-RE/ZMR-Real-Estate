import { useState } from 'react'
import { useActionQueue } from './useActionQueue'
import { ActionItemForm } from './ActionItemForm'
import { ActionQueueSummary } from './ActionQueueSummary'
import { ActionQueueFilters } from './ActionQueueFilters'
import { ActionQueueList } from './ActionQueueList'

type ActionQueueTab = 'to_resolve' | 'automations'

const TABS: { key: ActionQueueTab; label: string }[] = [
  { key: 'to_resolve', label: 'To resolve' },
  { key: 'automations', label: 'Automations' },
]

// Roadmap 10.5 — full Action Queue build, overhauling 10.2's initial
// collapsible-boxes-by-type board. The same action_items table also
// backs the per-property Follow-ups card on the KPI tab
// (PropertyProfileKpiTab.tsx → FollowUpsCard.tsx) via the same
// useActionQueue hook scoped to one property — one source of truth, no
// duplicate entry between the two views.
export function ActionQueueBoard() {
  const [tab, setTab] = useState<ActionQueueTab>('to_resolve')
  const {
    propertyOptions,
    propertyFilter,
    setPropertyFilter,
    memberOptions,
    loading,
    error,
    processingId,
    isCreating,
    saving,
    formInitialValues,
    startCreating,
    cancelForm,
    save,
    filteredItems,
    typeOptions,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    assigneeFilter,
    setAssigneeFilter,
    searchQuery,
    setSearchQuery,
    dueDateSort,
    setDueDateSort,
    summary,
    selectedItemId,
    setSelectedItemId,
    complete,
    reopen,
    saveEdit,
  } = useActionQueue()

  const handleStartCreating = () => {
    setSelectedItemId(null)
    startCreating()
  }

  return (
    <div>
      <div className="page-header-row">
        <div className="tab-bar" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'to_resolve' && !isCreating && (
          <button type="button" onClick={handleStartCreating}>
            + New action
          </button>
        )}
      </div>

      {tab === 'automations' ? (
        <p>Automations is coming with Phase 11's agent roster.</p>
      ) : (
        <>
          {error && <p role="alert">{error}</p>}

          {isCreating && (
            <ActionItemForm
              initialValues={formInitialValues}
              propertyOptions={propertyOptions}
              memberOptions={memberOptions}
              saving={saving}
              onSave={save}
              onCancel={cancelForm}
            />
          )}

          <ActionQueueSummary
            overdue={summary.overdue}
            dueThisWeek={summary.dueThisWeek}
            upcoming={summary.upcoming}
            automated={summary.automated}
          />

          <ActionQueueFilters
            propertyOptions={propertyOptions}
            propertyFilter={propertyFilter}
            onPropertyFilterChange={setPropertyFilter}
            typeOptions={typeOptions}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            memberOptions={memberOptions}
            assigneeFilter={assigneeFilter}
            onAssigneeFilterChange={setAssigneeFilter}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />

          {loading ? (
            <p>Loading…</p>
          ) : (
            <ActionQueueList
              items={filteredItems}
              propertyOptions={propertyOptions}
              memberOptions={memberOptions}
              processingId={processingId}
              saving={saving}
              dueDateSort={dueDateSort}
              onDueDateSortChange={setDueDateSort}
              selectedItemId={selectedItemId}
              onSelect={setSelectedItemId}
              onComplete={complete}
              onReopen={reopen}
              onSaveEdit={saveEdit}
            />
          )}
        </>
      )}
    </div>
  )
}
