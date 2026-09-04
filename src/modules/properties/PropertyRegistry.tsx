import { usePropertyRegistry } from './usePropertyRegistry'
import { PropertyList } from './PropertyList'
import { PropertyForm } from './PropertyForm'

export function PropertyRegistry() {
  const {
    properties,
    llcOptions,
    createLlc,
    loading,
    error,
    isFormOpen,
    formKey,
    formInitialValues,
    saving,
    startCreating,
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
          llcOptions={llcOptions}
          onCreateLlc={createLlc}
          saving={saving}
          onSave={save}
          onCancel={cancelForm}
        />
      ) : (
        <PropertyList properties={properties} onAddNew={startCreating} />
      )}
    </div>
  )
}
