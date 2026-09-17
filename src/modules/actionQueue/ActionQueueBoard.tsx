import { SearchableSelect } from '../../shared/SearchableSelect'
import { CollapsibleSection } from '../../shared/CollapsibleSection'
import { useActionQueue } from './useActionQueue'
import { ActionItemForm } from './ActionItemForm'
import { ActionItemList } from './ActionItemList'

// Roadmap 10.2 — Action Queue's unified task/action data model, grouped
// into collapsible boxes by type. Portfolio-wide; the same action_items
// table also backs the per-property Follow-ups card on the KPI tab
// (PropertyFollowUps.tsx) via the same useActionQueue hook scoped to one
// property — one source of truth, no duplicate entry between the two
// views.
export function ActionQueueBoard() {
  const {
    groups,
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
    complete,
  } = useActionQueue()

  return (
    <div>
      <label htmlFor="action_queue_property_filter">Filter by property</label>
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

      {isCreating ? (
        <ActionItemForm
          initialValues={formInitialValues}
          propertyOptions={propertyOptions}
          memberOptions={memberOptions}
          saving={saving}
          onSave={save}
          onCancel={cancelForm}
        />
      ) : (
        <button type="button" onClick={startCreating}>
          + Add action item
        </button>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : groups.length === 0 ? (
        <p className="empty-state">No open action items.</p>
      ) : (
        groups.map(([type, items]) => (
          <CollapsibleSection key={type} title={`${type} (${items.length})`} defaultOpen>
            <ActionItemList items={items} processingId={processingId} onComplete={complete} />
          </CollapsibleSection>
        ))
      )}
    </div>
  )
}
