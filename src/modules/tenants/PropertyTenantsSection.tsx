import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EditableSection } from '../../shared/EditableSection'
import { AddTenancyForm } from './AddTenancyForm'
import { PropertyTenantsOverview } from './PropertyTenantsOverview'
import type { AddedTenant } from './useAddTenancy'

interface PropertyTenantsSectionProps {
  propertyId: string
  // Called after a tenancy is saved, so the Units box shows it too.
  onTenancyAdded: () => void
}

// Property Overview › Tenants. View: every tenant ever at this property.
// "+ Add tenant" (or Edit): add a tenant (existing or new person, co-tenants) to a unit of this
// property — the same lease the Units box creates. After saving, the box
// links to each tenant's Tenancy & billing.
export function PropertyTenantsSection({ propertyId, onTenancyAdded }: PropertyTenantsSectionProps) {
  const [added, setAdded] = useState<{ tenants: AddedTenant[]; unitLabel: string } | null>(null)

  return (
    <EditableSection
      title="Tenants"
      // Owner-approved visible entry point; Edit leads to the same form.
      addLabel="+ Add tenant"
      onEditStart={() => setAdded(null)}
      view={
        <>
          {added && (
            <p className="success-message" role="status">
              Added to {added.unitLabel}:{' '}
              {added.tenants.map((t, i) => (
                <span key={t.id}>
                  {i > 0 && ', '}
                  <Link to={`/tenants/${t.id}`}>{t.name} — Tenancy &amp; billing</Link>
                </span>
              ))}
            </p>
          )}
          <PropertyTenantsOverview propertyId={propertyId} />
        </>
      }
      edit={(exit) => (
        <AddTenancyForm
          propertyId={propertyId}
          onCancel={exit}
          onSaved={(tenants, unitLabel) => {
            setAdded({ tenants, unitLabel })
            onTenancyAdded()
            exit()
          }}
        />
      )}
    />
  )
}
