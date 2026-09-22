import { useInsuranceLedger } from './useInsuranceLedger'
import { InsuranceLedgerList } from './InsuranceLedgerList'
import { InsurancePolicyForm } from './InsurancePolicyForm'

interface InsuranceLedgerProps {
  propertyId: string
}

// New build item — Insurance as a historical ledger, replacing the
// single static Insurance block (properties.insurance_provider/
// insurance_policy_number) with dated entries: provider, policy #,
// contact info, coverage start/end, premium amount, multiple documents
// per entry. Exact pattern of Property Tax Installments (9.5). Embedded
// in the Property Profile's Overview tab, same as every other section
// there, until the 7.9 tab restructure gives it its own tab.
export function InsuranceLedger({ propertyId }: InsuranceLedgerProps) {
  const {
    policies,
    loading,
    error,
    editingId,
    editingPolicy,
    formInitialValues,
    saving,
    startAdding,
    startEditing,
    cancelEditing,
    save,
    viewDocument,
  } = useInsuranceLedger(propertyId)

  return (
    <section className="insurance-ledger-section">
      {loading ? (
        <p>Loading…</p>
      ) : (
        <InsuranceLedgerList policies={policies} onEdit={startEditing} onViewDocument={viewDocument} />
      )}

      {editingId ? (
        <InsurancePolicyForm
          key={editingId}
          initialValues={formInitialValues}
          existingDocuments={editingPolicy?.documents ?? []}
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
            Add insurance policy
          </button>
        </>
      )}
    </section>
  )
}
