import { SearchableSelect } from '../../shared/SearchableSelect'
import { ManageOptionsPanel } from '../../shared/pickLists/ManageOptionsPanel'
import { ActionQueueBoard } from '../actionQueue/ActionQueueBoard'
import { useReconciliationQueue } from './useReconciliationQueue'
import { ReconciliationList } from './ReconciliationList'

// This page is what the "Action Queue" nav item (roadmap 10.1) has
// pointed to since before roadmap 10.2's unified data model existed —
// it was, and still is, the Reconciliation Queue (1.4) underneath.
// ActionQueueBoard is mounted here (rather than a new route) so the nav
// item's actual destination matches its label without touching
// App.tsx/AppShell.tsx, both out of scope for this item. The two
// sections below are genuinely different concerns (action items vs.
// captured-document triage) kept on one page only because of that
// routing constraint, not because they're related features.
export function ReconciliationQueue() {
  const {
    entries,
    propertyOptions,
    propertyFilter,
    setPropertyFilter,
    loading,
    error,
    processingId,
    documentTypeOptions,
    categoryByEntry,
    setCategory,
    reconcile,
    viewAttachment,
  } = useReconciliationQueue()

  return (
    <div>
      <h1>Action Queue</h1>
      <ActionQueueBoard />

      <div className="page-header-row">
        <h2>Reconciliation</h2>
        <ManageOptionsPanel
          title="Document types"
          options={documentTypeOptions.options}
          loading={documentTypeOptions.loading}
          error={documentTypeOptions.error}
          saving={documentTypeOptions.saving}
          onAdd={documentTypeOptions.add}
          onArchive={documentTypeOptions.archive}
          onRestore={documentTypeOptions.restore}
        />
      </div>

      <label htmlFor="property_filter">Filter by property</label>
      <SearchableSelect
        options={propertyOptions}
        value={propertyFilter}
        onChange={setPropertyFilter}
        placeholder="All properties"
      />
      {propertyFilter && (
        <button type="button" onClick={() => setPropertyFilter(null)}>
          Clear filter
        </button>
      )}

      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <ReconciliationList
          entries={entries}
          processingId={processingId}
          categoryOptions={documentTypeOptions.activeOptions}
          categoryByEntry={categoryByEntry}
          onCategoryChange={setCategory}
          onViewAttachment={viewAttachment}
          onReconcile={reconcile}
        />
      )}
    </div>
  )
}
