import { Link, useParams } from 'react-router-dom'
import { Breadcrumb } from '../../shared/Breadcrumb'
import { EditableSection } from '../../shared/EditableSection'
import { CollapsibleSection } from '../../shared/CollapsibleSection'
import { TenantForm } from './TenantForm'
import { TenantProfileLeaseHistory } from './TenantProfileLeaseHistory'
import { TenantProfileDocuments } from './TenantProfileDocuments'
import { useTenantProfile } from './useTenantProfile'

// Roadmap "Units/Lease/Tenant rebuild" item 5 — a standalone Tenant
// profile page (net new — no such route existed before this rebuild).
// Same page shape as PropertyProfile.tsx: breadcrumb, loading/not-found
// gates, then a stack of boxes (Tenant information as an editable box,
// Lease history and Documents as their own read-only/self-contained
// boxes below it).
export function TenantProfile() {
  const { id } = useParams<{ id: string }>()
  const { tenant, loading, error, saving, save } = useTenantProfile(id!)

  if (loading && !tenant) {
    return <p>Loading…</p>
  }

  if (!tenant) {
    return (
      <div>
        {error && <p role="alert">{error}</p>}
        <p>Tenant not found.</p>
        <Link to="/properties">Back to property registry</Link>
      </div>
    )
  }

  return (
    <div>
      <Breadcrumb to="/properties" label="Property registry" />
      <div className="page-header-row">
        <h1>{tenant.name}</h1>
      </div>
      {error && <p role="alert">{error}</p>}

      <EditableSection
        title="Tenant information"
        defaultOpen
        view={
          <dl className="field-grid">
            {tenant.email !== null && (
              <div className="field">
                <dt>Email</dt>
                <dd>{tenant.email}</dd>
              </div>
            )}
            {tenant.phone !== null && (
              <div className="field">
                <dt>Phone</dt>
                <dd>{tenant.phone}</dd>
              </div>
            )}
            {tenant.notes !== null && (
              <div className="field">
                <dt>Notes</dt>
                <dd>{tenant.notes}</dd>
              </div>
            )}
          </dl>
        }
        edit={(exitEditing) => (
          <TenantForm
            initialValues={{ name: tenant.name, email: tenant.email, phone: tenant.phone, notes: tenant.notes }}
            saving={saving}
            error={null}
            onSave={async (input) => {
              const ok = await save(input)
              if (ok) exitEditing()
            }}
            onCancel={exitEditing}
          />
        )}
      />

      <CollapsibleSection title="Lease history" defaultOpen>
        <TenantProfileLeaseHistory tenantId={tenant.id} />
      </CollapsibleSection>

      <CollapsibleSection title="Documents">
        <TenantProfileDocuments tenantId={tenant.id} />
      </CollapsibleSection>
    </div>
  )
}
