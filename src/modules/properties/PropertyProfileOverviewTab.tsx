import { useEffect, useState } from 'react'
import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { CollapsibleSection } from '../../shared/CollapsibleSection'
import type { LlcInput } from '../llcs/llcsQueries'
import type { HoldingCompanyInput } from '../holdingCompanies/holdingCompaniesQueries'
import { PropertyTaxLedger } from '../propertyTax/PropertyTaxLedger'
import { PropertyValueHistorySection } from '../propertyValueHistory/PropertyValueHistorySection'
import { UnitsSection } from '../units/UnitsSection'
import { PropertySpecsSection } from '../propertySpecs/PropertySpecsSection'
import { UtilityRecordsSection } from '../utilities/UtilityRecordsSection'
import { SecurityDepositsSection } from '../securityDeposits/SecurityDepositsSection'
import { PropertyTenantsOverview } from '../tenants/PropertyTenantsOverview'
import type { DocumentRecord } from '../documents/documentsQueries'
import { FinancialAccountsSection } from '../financialAccounts/FinancialAccountsSection'
import { PropertyForm } from './PropertyForm'
import { PropertySummary } from './PropertySummary'
import type { Property, PropertyInput } from './propertiesQueries'

interface PropertyProfileOverviewTabProps {
  property: Property
  isEditing: boolean
  onStartEditing: () => void
  onCancelEdit: () => void
  llcOptions: SearchableSelectOption[]
  onCreateLlc: (input: LlcInput) => Promise<{ id: string } | { error: string }>
  holdingCompanyOptions: SearchableSelectOption[]
  onCreateHoldingCompany: (input: HoldingCompanyInput) => Promise<{ id: string } | { error: string }>
  documents: DocumentRecord[]
  onViewDocument: (path: string) => void
  onValueHistoryChanged: () => Promise<void>
  saving: boolean
  onSave: (input: PropertyInput) => Promise<boolean>
}

// Roadmap 7.10 — every section on this tab (including core property
// fields, view-by-default per 7.7 via defaultOpen) uses the same
// CollapsibleSection box so the tab reads as one consistent set of
// sections rather than a mix of collapsible and non-collapsible boxes.
// Units stays last per the roadmap item's own "near the bottom,
// reference-only" note — full unit CRUD (plus each unit's nested
// specs/leasing/tenants/utilities) stays exactly as 7.2 built it, just
// relocated into a box rather than rebuilt.
export function PropertyProfileOverviewTab({
  property,
  isEditing,
  onStartEditing,
  onCancelEdit,
  llcOptions,
  onCreateLlc,
  holdingCompanyOptions,
  onCreateHoldingCompany,
  documents,
  onViewDocument,
  onValueHistoryChanged,
  saving,
  onSave,
}: PropertyProfileOverviewTabProps) {
  const insuranceDocuments = documents.filter((doc) => doc.category === 'Insurance')

  // Roadmap 7.22 — a field group's "+ Add …" prompt jumps straight into
  // edit mode with that group's first missing field scrolled into view
  // and focused, rather than dropping the user into the top of a long
  // flat form to hunt for it themselves.
  const [autoFocusFieldId, setAutoFocusFieldId] = useState<string | null>(null)

  // Resets on any exit from edit mode — Cancel and a successful save
  // both flip isEditing false, and a successful save does it via the
  // parent hook directly rather than through a handler this component
  // owns, so there's no single call site to reset it from instead.
  // Without this, a later plain "Edit property" click could still carry
  // a stale focus target left over from an earlier "+ Add …" click.
  useEffect(() => {
    if (!isEditing) setAutoFocusFieldId(null)
  }, [isEditing])

  const handleAddFields = (fieldKeys: string[]) => {
    setAutoFocusFieldId(fieldKeys[0] ?? null)
    onStartEditing()
  }

  return (
    <div className="property-overview-grid">
      <CollapsibleSection title="Property information" defaultOpen>
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
            autoFocusFieldId={autoFocusFieldId}
          />
        ) : (
          <PropertySummary
            property={property}
            llcOptions={llcOptions}
            insuranceDocuments={insuranceDocuments}
            onViewDocument={onViewDocument}
            onAddFields={handleAddFields}
          />
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Financial accounts">
        <FinancialAccountsSection propertyId={property.id} />
      </CollapsibleSection>

      <CollapsibleSection title="Property tax installments">
        <PropertyTaxLedger propertyId={property.id} />
      </CollapsibleSection>

      <CollapsibleSection title="Market & rent value history">
        <PropertyValueHistorySection propertyId={property.id} onChanged={onValueHistoryChanged} />
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
    </div>
  )
}
