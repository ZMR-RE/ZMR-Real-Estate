import { Link, useParams } from 'react-router-dom'
import { Breadcrumb } from '../../shared/Breadcrumb'
import { EditableSection } from '../../shared/EditableSection'
import { CollapsibleSection } from '../../shared/CollapsibleSection'
import { useAuth } from '../../shared/auth/AuthContext'
import { LlcFinancialAccountsPanel } from './LlcFinancialAccountsPanel'
import { EntityIdentityForm } from './EntityIdentityForm'
import { EntityTaxForm } from './EntityTaxForm'
import { EntityTaxElectionsPanel } from './EntityTaxElectionsPanel'
import { EntityContactsPanel } from './EntityContactsPanel'
import { EntityLinkedPropertiesPanel } from './EntityLinkedPropertiesPanel'
import { EntityMembershipSection } from './EntityMembershipSection'
import { EntityDocumentsPanel } from './EntityDocumentsPanel'
import { useEntityProfile } from './useEntityProfile'
import { useLlcs } from './useLlcs'

const OWNER_KIND_LABEL: Record<string, string> = {
  individual: 'Individual',
  entity: 'Legal entity',
}

const LEGAL_STRUCTURE_LABEL: Record<string, string> = {
  llc: 'LLC',
  corporation: 'Corporation',
  partnership: 'Partnership',
  trust: 'Trust',
  other: 'Other',
  unknown: 'Unknown',
}

// Owner/entity profile page — same shape as TenantProfile.tsx (the most
// current precedent for a standalone profile built on EditableSection):
// breadcrumb, loading/not-found gates, then a stack of boxes. Reached
// from a property's Ownership section and from Settings -> Organization
// types; not part of primary navigation.
export function EntityProfile() {
  const { id } = useParams<{ id: string }>()
  const { accountId } = useAuth()
  const { entity, loading, error, saving, save, markVerified } = useEntityProfile(id!)
  const { llcOptions } = useLlcs(accountId)

  if (loading && !entity) {
    return <p>Loading…</p>
  }

  if (!entity) {
    return (
      <div>
        {error && <p role="alert">{error}</p>}
        <p>Entity not found.</p>
        <Link to="/properties">Back to property registry</Link>
      </div>
    )
  }

  return (
    <div>
      <Breadcrumb to="/properties" label="Property registry" />
      <div className="page-header-row">
        <h1>{entity.display_name ?? entity.name}</h1>
      </div>
      <p>
        <span className={`status-badge ${entity.archived ? 'status-badge-neutral' : 'status-badge-success'}`}>
          {entity.archived ? 'Archived' : 'Active'}
        </span>{' '}
        {entity.owner_kind
          ? entity.owner_kind === 'entity' && entity.legal_structure
            ? LEGAL_STRUCTURE_LABEL[entity.legal_structure]
            : OWNER_KIND_LABEL[entity.owner_kind]
          : 'Owner / entity kind — not yet confirmed'}
      </p>
      {error && <p role="alert">{error}</p>}

      <EditableSection
        title="Identity"
        defaultOpen
        view={
          <>
            <dl className="field-grid">
              {entity.owner_kind && <div className="field"><dt>Owner / entity kind</dt><dd>{OWNER_KIND_LABEL[entity.owner_kind]}</dd></div>}
              <div className="field"><dt>Legal name</dt><dd>{entity.name}</dd></div>
              {entity.display_name && <div className="field"><dt>Display name</dt><dd>{entity.display_name}</dd></div>}
              {entity.legal_structure && (
                <div className="field"><dt>Legal structure</dt><dd>{LEGAL_STRUCTURE_LABEL[entity.legal_structure]}</dd></div>
              )}
              {entity.formation_state && <div className="field"><dt>Formation jurisdiction</dt><dd>{entity.formation_state}</dd></div>}
              {entity.formation_date && <div className="field"><dt>Formation date</dt><dd>{entity.formation_date}</dd></div>}
              {entity.ein && <div className="field"><dt>EIN</dt><dd>{entity.ein}</dd></div>}
              {entity.registered_agent && <div className="field"><dt>Registered agent</dt><dd>{entity.registered_agent}</dd></div>}
              {entity.annual_report_due_date && (
                <div className="field"><dt>Annual report due date</dt><dd>{entity.annual_report_due_date}</dd></div>
              )}
              {entity.holding_company && <div className="field"><dt>Holding company</dt><dd>{entity.holding_company.name}</dd></div>}
              {entity.mailing_address && <div className="field"><dt>Mailing address</dt><dd>{entity.mailing_address}</dd></div>}
              {entity.notes && <div className="field"><dt>Notes</dt><dd>{entity.notes}</dd></div>}
              {entity.last_verified_date && <div className="field"><dt>Last verified</dt><dd>{entity.last_verified_date}</dd></div>}
            </dl>
            <button type="button" onClick={() => markVerified()}>
              Mark verified
            </button>
          </>
        }
        edit={(exitEditing) => (
          <EntityIdentityForm
            entity={entity}
            saving={saving}
            onSave={async (input) => {
              const ok = await save(input)
              if (ok) exitEditing()
            }}
            onCancel={exitEditing}
          />
        )}
      />

      <CollapsibleSection title="Contacts">
        <EntityContactsPanel llcId={entity.id} />
      </CollapsibleSection>

      <CollapsibleSection title="Linked properties" defaultOpen>
        <EntityLinkedPropertiesPanel llcId={entity.id} />
      </CollapsibleSection>

      <EditableSection
        title="Tax classification"
        view={
          <>
            <dl className="field-grid">
              {entity.membership && (
                <div className="field">
                  <dt>LLC membership</dt>
                  <dd>{entity.membership === 'single_member' ? 'Single member' : entity.membership === 'multiple_members' ? 'Multiple members' : 'Unknown'}</dd>
                </div>
              )}
              {entity.federal_tax_treatment && (
                <div className="field">
                  <dt>Federal tax treatment</dt>
                  <dd>{entity.federal_tax_treatment.replace(/_/g, ' ')}</dd>
                </div>
              )}
              {entity.federal_tax_treatment_effective_date && (
                <div className="field">
                  <dt>Treatment effective date</dt>
                  <dd>{entity.federal_tax_treatment_effective_date}</dd>
                </div>
              )}
            </dl>
            <EntityTaxElectionsPanel llcId={entity.id} />
          </>
        }
        edit={(exitEditing) => (
          <EntityTaxForm
            entity={entity}
            saving={saving}
            onSave={async (input) => {
              const ok = await save(input)
              if (ok) exitEditing()
            }}
            onCancel={exitEditing}
          />
        )}
      />

      <EntityMembershipSection llcId={entity.id} llcOptions={llcOptions} />

      <CollapsibleSection title="Documents">
        <EntityDocumentsPanel llcId={entity.id} />
      </CollapsibleSection>

      <CollapsibleSection title="Financial accounts">
        <LlcFinancialAccountsPanel llcId={entity.id} />
      </CollapsibleSection>
    </div>
  )
}
