import { usePropertyRegistry } from './usePropertyRegistry'
import { PropertyList } from './PropertyList'
import { PropertyForm } from './PropertyForm'
import { PropertyCreationWizard } from './PropertyCreationWizard'
import { PropertySaveConflictNotice } from './PropertySaveConflictNotice'

// Package 1 — "+ Add property" now launches the real four-step creation
// wizard (Ownership → Property basics → Documents → Review) in place of
// the old blank-PropertyForm quick-create path; still the same
// /properties registry route, no new page or nav item. Editing an
// EXISTING property (formPropertyId set — reachable today only if
// selectProperty is ever wired to something; PropertyList's own rows
// navigate straight to /properties/:id instead) still uses PropertyForm,
// unchanged.
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

  const isCreatingNew = isFormOpen && formPropertyId === null

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
      {isCreatingNew ? (
        <PropertyCreationWizard onCancel={cancelForm} />
      ) : isFormOpen ? (
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
