import { SearchableSelect } from '../../shared/SearchableSelect'
import { TaskForm } from './TaskForm'
import { TaskList } from './TaskList'
import { UpcomingTasks } from './UpcomingTasks'
import { useTaskEngine } from './useTaskEngine'

export function TaskEngine() {
  const {
    tasks,
    upcoming,
    propertyOptions,
    propertyFilter,
    setPropertyFilter,
    loading,
    error,
    processingId,
    isFormOpen,
    formKey,
    formInitialValues,
    saving,
    startCreating,
    selectTask,
    cancelForm,
    save,
    complete,
  } = useTaskEngine()

  return (
    <div>
      <h1>Task Engine</h1>

      <section>
        <h2>Coming up</h2>
        <UpcomingTasks tasks={upcoming} />
      </section>

      <section>
        <h2>Tasks</h2>

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

        {!isFormOpen && (
          <button type="button" onClick={startCreating}>
            Add task
          </button>
        )}

        {error && <p role="alert">{error}</p>}

        {isFormOpen && (
          <TaskForm
            key={formKey}
            initialValues={formInitialValues}
            propertyOptions={propertyOptions}
            saving={saving}
            onSave={save}
            onCancel={cancelForm}
          />
        )}

        {loading ? (
          <p>Loading…</p>
        ) : (
          <TaskList
            tasks={tasks}
            processingId={processingId}
            onSelect={selectTask}
            onComplete={complete}
          />
        )}
      </section>
    </div>
  )
}
