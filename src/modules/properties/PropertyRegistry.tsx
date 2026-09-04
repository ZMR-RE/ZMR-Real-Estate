import { usePropertyRegistry } from './usePropertyRegistry'
import { PropertyList } from './PropertyList'
import { PropertyForm } from './PropertyForm'

export function PropertyRegistry() {
  const {
    properties,
    loading,
    error,
    isFormOpen,
    formKey,
    formInitialValues,
    saving,
    startCreating,
    selectProperty,
    cancelForm,
    save,
  } = usePropertyRegistry()

  if (loading) {
    return <p>Loading properties…</p>
  }

  return (
    <div>
      <h1>Property Registry</h1>
      {error && <p role="alert">{error}</p>}

      {isFormOpen ? (
        <PropertyForm
          key={formKey}
          initialValues={formInitialValues}
          saving={saving}
          onSave={save}
          onCancel={cancelForm}
        />
      ) : (
        <PropertyList properties={properties} onSelect={selectProperty} onAddNew={startCreating} />
      )}
    </div>
  )
}
