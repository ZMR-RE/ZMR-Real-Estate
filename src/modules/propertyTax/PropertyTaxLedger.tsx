import { usePropertyTaxLedger } from './usePropertyTaxLedger'
import { PropertyTaxLedgerList } from './PropertyTaxLedgerList'
import { PropertyTaxInstallmentForm } from './PropertyTaxInstallmentForm'
import { EditableSection } from '../../shared/EditableSection'

interface PropertyTaxLedgerProps {
  propertyId: string
}

// Roadmap 9.5 — Property Tax Installment ledger. Embedded in the Property
// Profile's Overview tab until the 7.9 tab restructure gives it its own tab.
//
// Standard rollout completeness — converted to the Box interaction
// standard's EditableSection: view state shows a read-only list (no
// per-row Edit); clicking the box's own Edit reveals the interactive
// list plus "+ Add tax year", replacing the old always-visible Add
// button below the list. Exact same pattern as Insurance (7.25).
export function PropertyTaxLedger({ propertyId }: PropertyTaxLedgerProps) {
  const {
    installments,
    loading,
    error,
    editingId,
    editingInstallment,
    formInitialValues,
    saving,
    startAdding,
    startEditing,
    cancelEditing,
    save,
    viewDocument,
  } = usePropertyTaxLedger(propertyId)

  return (
    <EditableSection
      title="Property tax installments"
      onEditStart={cancelEditing}
      view={
        <>
          {error && <p role="alert">{error}</p>}
          {loading ? (
            <p>Loading…</p>
          ) : (
            <PropertyTaxLedgerList installments={installments} readOnly onViewDocument={viewDocument} />
          )}
        </>
      }
      edit={(exitEditing) => (
        <>
          {error && <p role="alert">{error}</p>}

          {loading ? (
            <p>Loading…</p>
          ) : (
            <PropertyTaxLedgerList installments={installments} onEdit={startEditing} onViewDocument={viewDocument} />
          )}

          {editingId ? (
            <PropertyTaxInstallmentForm
              key={editingId}
              initialValues={formInitialValues}
              existingInstallment1Documents={
                editingInstallment?.documents.filter((d) => d.tax_installment_number === 1) ?? []
              }
              existingInstallment2Documents={
                editingInstallment?.documents.filter((d) => d.tax_installment_number === 2) ?? []
              }
              saving={saving}
              error={error}
              onSave={save}
              onCancel={cancelEditing}
              onViewDocument={viewDocument}
            />
          ) : (
            <button type="button" onClick={startAdding}>
              + Add tax year
            </button>
          )}

          <button type="button" onClick={exitEditing}>
            Done
          </button>
        </>
      )}
    />
  )
}
