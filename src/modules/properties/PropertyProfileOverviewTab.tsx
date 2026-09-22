import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { CollapsibleSection } from '../../shared/CollapsibleSection'
import { EditableSection } from '../../shared/EditableSection'
import type { LlcInput } from '../llcs/llcsQueries'
import type { HoldingCompanyInput } from '../holdingCompanies/holdingCompaniesQueries'
import { PropertyTaxLedger } from '../propertyTax/PropertyTaxLedger'
import { InsuranceLedger } from '../insurance/InsuranceLedger'
import { PropertyValueHistorySection } from '../propertyValueHistory/PropertyValueHistorySection'
import { UnitsSection } from '../units/UnitsSection'
import { PropertySpecsSection } from '../propertySpecs/PropertySpecsSection'
import { UtilityRecordsSection } from '../utilities/UtilityRecordsSection'
import { SecurityDepositsSection } from '../securityDeposits/SecurityDepositsSection'
import { PropertyTenantsOverview } from '../tenants/PropertyTenantsOverview'
import { FinancialAccountsSection } from '../financialAccounts/FinancialAccountsSection'
import { PropertyForm } from './PropertyForm'
import { PropertySummary } from './PropertySummary'
import type { Property, PropertyInput } from './propertiesQueries'

interface PropertyProfileOverviewTabProps {
  property: Property
  llcOptions: SearchableSelectOption[]
  onCreateLlc: (input: LlcInput) => Promise<{ id: string } | { error: string }>
  holdingCompanyOptions: SearchableSelectOption[]
  onCreateHoldingCompany: (input: HoldingCompanyInput) => Promise<{ id: string } | { error: string }>
  onValueHistoryChanged: () => Promise<void>
  saving: boolean
  onSave: (input: PropertyInput) => Promise<boolean>
}

// Roadmap 7.10 — every section on this tab uses a consistent box
// pattern. Property information uses the Box interaction standard's
// EditableSection (self-contained view/edit toggle, single top-right
// Edit action) rather than CollapsibleSection + externally-owned
// isEditing — that external state (and the page-header "Edit property"
// button that used to control it) is gone; the box owns its own edit
// state now. Units stays last per the roadmap item's own "near the
// bottom, reference-only" note — full unit CRUD (plus each unit's
// nested specs/leasing/tenants/utilities) stays exactly as 7.2 built
// it, just relocated into a box rather than rebuilt.
export function PropertyProfileOverviewTab({
  property,
  llcOptions,
  onCreateLlc,
  holdingCompanyOptions,
  onCreateHoldingCompany,
  onValueHistoryChanged,
  saving,
  onSave,
}: PropertyProfileOverviewTabProps) {
  return (
    <div className="property-overview-grid">
      <EditableSection
        title="Property information"
        defaultOpen
        view={<PropertySummary property={property} llcOptions={llcOptions} />}
        edit={(exitEditing) => (
          <PropertyForm
            key={property.id}
            initialValues={property}
            llcOptions={llcOptions}
            onCreateLlc={onCreateLlc}
            holdingCompanyOptions={holdingCompanyOptions}
            onCreateHoldingCompany={onCreateHoldingCompany}
            saving={saving}
            onSave={async (input) => {
              const ok = await onSave(input)
              if (ok) exitEditing()
            }}
            onCancel={exitEditing}
          />
        )}
      />

      <FinancialAccountsSection propertyId={property.id} />

      <InsuranceLedger propertyId={property.id} />

      <PropertyTaxLedger propertyId={property.id} />

      <PropertyValueHistorySection propertyId={property.id} onChanged={onValueHistoryChanged} />

      <PropertySpecsSection propertyId={property.id} />

      <UtilityRecordsSection propertyId={property.id} />

      <SecurityDepositsSection propertyId={property.id} />

      <CollapsibleSection title="Tenants">
        <PropertyTenantsOverview propertyId={property.id} />
      </CollapsibleSection>

      <UnitsSection propertyId={property.id} />
    </div>
  )
}
