import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { CollapsibleSection } from '../../shared/CollapsibleSection'
import type { LlcInput } from '../llcs/llcsQueries'
import type { HoldingCompanyInput } from '../holdingCompanies/holdingCompaniesQueries'
import { PropertyTaxLedger } from '../propertyTax/PropertyTaxLedger'
import { UnitsSection } from '../units/UnitsSection'
import { PropertySpecsSection } from '../propertySpecs/PropertySpecsSection'
import { UtilityRecordsSection } from '../utilities/UtilityRecordsSection'
import { SecurityDepositsSection } from '../securityDeposits/SecurityDepositsSection'
import { PropertyTenantsOverview } from '../tenants/PropertyTenantsOverview'
import type { DocumentRecord } from '../documents/documentsQueries'
import { PropertyForm } from './PropertyForm'
import { PropertySummary } from './PropertySummary'
import type { Property, PropertyInput } from './propertiesQueries'

interface PropertyProfileOverviewTabProps {
  property: Property
  isEditing: boolean
  onCancelEdit: () => void
  llcOptions: SearchableSelectOption[]
  onCreateLlc: (input: LlcInput) => Promise<{ id: string } | { error: string }>
  holdingCompanyOptions: SearchableSelectOption[]
  onCreateHoldingCompany: (input: HoldingCompanyInput) => Promise<{ id: string } | { error: string }>
  documents: DocumentRecord[]
  onViewDocument: (path: string) => void
  saving: boolean
  onSave: (input: PropertyInput) => Promise<boolean>
}

// Roadmap 7.10 — core property fields stay always visible (via
// PropertySummary/PropertyForm, view-by-default per 7.7); everything
// else that used to sit flat on this tab now lives in its own
// collapsible box below, with Units last per the roadmap item's own
// "near the bottom, reference-only" note — full unit CRUD (plus each
// unit's nested specs/leasing/tenants/utilities) stays exactly as 7.2
// built it, just relocated into a box rather than rebuilt.
export function PropertyProfileOverviewTab({
  property,
  isEditing,
  onCancelEdit,
  llcOptions,
  onCreateLlc,
  holdingCompanyOptions,
  onCreateHoldingCompany,
  documents,
  onViewDocument,
  saving,
  onSave,
}: PropertyProfileOverviewTabProps) {
  const insuranceDocuments = documents.filter((doc) => doc.category === 'Insurance')

  return (
    <>
      {isEditing ? (
        <PropertyForm
          key={property.id}
          initialValues={property}
          llcOptions={llcOptions}
          onCreateLlc={onCreateLlc}
          holdingCompanyOptions={holdingCompanyOptions}
          onCreateHoldingCompany={onCreateHoldingCompany}
          saving={saving}
          onSave={onSave}
          onCancel={onCancelEdit}
        />
      ) : (
        <PropertySummary
          property={property}
          llcOptions={llcOptions}
          insuranceDocuments={insuranceDocuments}
          onViewDocument={onViewDocument}
        />
      )}

      <CollapsibleSection title="Property tax installments">
        <PropertyTaxLedger propertyId={property.id} />
      </CollapsibleSection>

      <CollapsibleSection title="Specs & measurements">
        <PropertySpecsSection propertyId={property.id} />
      </CollapsibleSection>

      <CollapsibleSection title="Utility records">
        <UtilityRecordsSection propertyId={property.id} />
      </CollapsibleSection>

      <CollapsibleSection title="Security deposits">
        <SecurityDepositsSection propertyId={property.id} />
      </CollapsibleSection>

      <CollapsibleSection title="Tenants">
        <PropertyTenantsOverview propertyId={property.id} />
      </CollapsibleSection>

      <CollapsibleSection title="Units">
        <UnitsSection propertyId={property.id} />
      </CollapsibleSection>
    </>
  )
}
