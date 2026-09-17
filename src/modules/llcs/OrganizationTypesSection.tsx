import { useAuth } from '../../shared/auth/AuthContext'
import { useHoldingCompanies } from '../holdingCompanies/useHoldingCompanies'
import { useLlcs } from './useLlcs'
import { useOrganizationTypes } from './useOrganizationTypes'
import { LlcForm } from './LlcForm'
import { OrganizationTypeList } from './OrganizationTypeList'

// Roadmap 8.2a/8.2b/8.2c — Organization type ("LLC") management: rename,
// edit/archive existing records (previously add-only), and see/reassign
// the properties assigned to one. Lives in Settings, same home as Chart
// of Accounts and the pick-list manager — no new top-level nav item.
export function OrganizationTypesSection() {
  const { accountId } = useAuth()
  const { llcOptions } = useLlcs(accountId)
  const { holdingCompanyOptions, addHoldingCompany } = useHoldingCompanies(accountId)
  const { llcs, loading, error, isAdding, editingId, saving, startAdding, startEditing, cancelForm, add, save, toggleArchived } =
    useOrganizationTypes(accountId)

  return (
    <section>
      <h2>Organization types</h2>
      <p>The LLCs (or individual ownership) properties are held under — edit, archive, or see what's assigned to each.</p>

      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <OrganizationTypeList
          accountId={accountId}
          llcs={llcs}
          llcOptions={llcOptions}
          editingId={editingId}
          saving={saving}
          error={error}
          holdingCompanyOptions={holdingCompanyOptions}
          onCreateHoldingCompany={addHoldingCompany}
          onStartEditing={startEditing}
          onSave={save}
          onCancel={cancelForm}
          onToggleArchived={toggleArchived}
        />
      )}

      {isAdding ? (
        <LlcForm
          saving={saving}
          error={error}
          holdingCompanyOptions={holdingCompanyOptions}
          onCreateHoldingCompany={addHoldingCompany}
          onSave={add}
          onCancel={cancelForm}
        />
      ) : (
        <button type="button" onClick={startAdding}>
          + Add organization type
        </button>
      )}
    </section>
  )
}
