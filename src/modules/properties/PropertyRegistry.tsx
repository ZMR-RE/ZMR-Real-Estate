import { usePropertyRegistry } from './usePropertyRegistry'
import { PropertyList } from './PropertyList'
import { PropertyForm } from './PropertyForm'
import { PropertySaveConflictNotice } from './PropertySaveConflictNotice'

export function PropertyRegistry() {
  const {
    properties,
    llcOptions,
    createLlc,
    holdingCompanyOptions,
    createHoldingCompany,
    loading,
    error,
    isFormOpen,
    formKey,
    formPropertyId,
    formInitialValues,
    saving,
    startCreating,
    cancelForm,
    save,
    conflict,
    keepEditingAfterConflict,
    discardDraftAndLoadLatest,
  } = usePropertyRegistry()

  if (loading) {
    return <p>Loading properties…</p>
  }

  return (
    <div>
      <h1>Property registry</h1>
      {error && <p role="alert">{error}</p>}

      {/* Batch I5 — a refused save keeps the form open with its draft
          (see usePropertyRegistry.save: no refresh() on conflict, since
          refresh() would unmount this form) and explains what happened. */}
      {isFormOpen && conflict && (
        <PropertySaveConflictNotice
          latest={conflict}
          onKeepEditing={keepEditingAfterConflict}
          onDiscardAndReload={discardDraftAndLoadLatest}
        />
      )}
      {isFormOpen ? (
        <PropertyForm
          key={formKey}
          propertyId={formPropertyId}
          initialValues={formInitialValues}
          llcOptions={llcOptions}
          onCreateLlc={createLlc}
          holdingCompanyOptions={holdingCompanyOptions}
          onCreateHoldingCompany={createHoldingCompany}
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
