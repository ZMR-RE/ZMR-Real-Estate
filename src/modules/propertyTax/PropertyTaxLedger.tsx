import { usePropertyTaxLedger } from './usePropertyTaxLedger'
import { PropertyTaxLedgerList } from './PropertyTaxLedgerList'
import { PropertyTaxInstallmentForm } from './PropertyTaxInstallmentForm'

interface PropertyTaxLedgerProps {
  propertyId: string
}

// Roadmap 9.5 — Property Tax Installment ledger. Embedded in the Property
// Profile's Overview tab until the 7.9 tab restructure gives it its own tab.
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
    <section className="property-tax-ledger-section">
      <h2>Property tax installments</h2>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <PropertyTaxLedgerList installments={installments} onEdit={startEditing} onViewDocument={viewDocument} />
      )}

      {editingId ? (
        <PropertyTaxInstallmentForm
          key={editingId}
          initialValues={formInitialValues}
          existingInstallment1Document={editingInstallment?.installment_1_document ?? null}
          existingInstallment2Document={editingInstallment?.installment_2_document ?? null}
          saving={saving}
          error={error}
          onSave={save}
          onCancel={cancelEditing}
          onViewDocument={viewDocument}
        />
      ) : (
        <>
          {error && <p role="alert">{error}</p>}
          <button type="button" onClick={startAdding}>
            Add tax year
          </button>
        </>
      )}
    </section>
  )
}
