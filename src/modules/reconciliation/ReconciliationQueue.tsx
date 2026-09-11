import { SearchableSelect } from '../../shared/SearchableSelect'
import { ManageOptionsPanel } from '../../shared/pickLists/ManageOptionsPanel'
import { useReconciliationQueue } from './useReconciliationQueue'
import { ReconciliationList } from './ReconciliationList'

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
      <div className="page-header-row">
        <h1>Reconciliation Queue</h1>
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
