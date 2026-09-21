import { useAuth } from '../../shared/auth/AuthContext'
import { useVendorsManagement } from './useVendorsManagement'
import { VendorForm } from './VendorForm'
import { VendorList } from './VendorList'

// Roadmap 1.17 — Vendor management, alongside Organization types in
// Settings (OrganizationTypesSection.tsx is this component's model).
export function VendorsSection() {
  const { accountId } = useAuth()
  const {
    vendors,
    loading,
    error,
    isAdding,
    editingId,
    saving,
    startAdding,
    startEditing,
    cancelForm,
    add,
    save,
    toggleArchived,
  } = useVendorsManagement(accountId)

  return (
    <section>
      <h2>Vendors</h2>
      <p>Vendors used across Quick Capture and Financials — add, edit, archive, or restore.</p>

      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <VendorList
          vendors={vendors}
          editingId={editingId}
          saving={saving}
          error={error}
          onStartEditing={startEditing}
          onSave={save}
          onCancel={cancelForm}
          onToggleArchived={toggleArchived}
        />
      )}

      {isAdding ? (
        <VendorForm saving={saving} error={error} onSave={add} onCancel={cancelForm} />
      ) : (
        <button type="button" onClick={startAdding}>
          + Add vendor
        </button>
      )}
    </section>
  )
}
