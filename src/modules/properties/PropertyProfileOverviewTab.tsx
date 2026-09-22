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
import { PropertySnapshotPanel } from './PropertySnapshotPanel'
import type { Property, PropertyInput } from './propertiesQueries'
import type { Transaction } from '../financials/financialsQueries'
import type { ActivityLogEntry } from '../capture/captureQueries'

interface PropertyProfileOverviewTabProps {
  property: Property
  llcOptions: SearchableSelectOption[]
  onCreateLlc: (input: LlcInput) => Promise<{ id: string } | { error: string }>
  holdingCompanyOptions: SearchableSelectOption[]
  onCreateHoldingCompany: (input: HoldingCompanyInput) => Promise<{ id: string } | { error: string }>
  onValueHistoryChanged: () => Promise<void>
  saving: boolean
  onSave: (input: PropertyInput) => Promise<boolean>
  transactions: Transaction[]
  activity: ActivityLogEntry[]
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
//
// Standard rollout completeness — two curated columns at desktop widths
// (Property information/Financial accounts/Insurance; Market & rent
// value history/Property tax installments/Tenants), each an independent
// vertical stack rather than a shared-row grid, so unequal box heights
// between the two columns never force blank space into a box's own row
// (the exact problem the earlier full-width-only redesign was avoiding).
// Specs & measurements, Utility records, Security deposits, and Units
// stay full-width below both columns — Specs & measurements and Units
// per the task's own "given their size" call-out; Utility records and
// Security deposits weren't named for a column, so they stay put rather
// than guessing a placement. Single column on mobile (.property-overview-
// columns in index.css).
export function PropertyProfileOverviewTab({
  property,
  llcOptions,
  onCreateLlc,
  holdingCompanyOptions,
  onCreateHoldingCompany,
  onValueHistoryChanged,
  saving,
  onSave,
  transactions,
  activity,
}: PropertyProfileOverviewTabProps) {
  return (
    <div className="property-overview-layout">
      <div className="property-overview-grid">
      <div className="property-overview-columns">
          <div className="property-overview-column">
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
          </div>

          <div className="property-overview-column">
            <PropertyValueHistorySection propertyId={property.id} onChanged={onValueHistoryChanged} />

            <PropertyTaxLedger propertyId={property.id} />

            <CollapsibleSection title="Tenants">
              <PropertyTenantsOverview propertyId={property.id} />
            </CollapsibleSection>
          </div>
        </div>

        <PropertySpecsSection propertyId={property.id} />

        <UtilityRecordsSection propertyId={property.id} />

        <SecurityDepositsSection propertyId={property.id} />

        <UnitsSection propertyId={property.id} />
      </div>

      <PropertySnapshotPanel propertyId={property.id} transactions={transactions} activity={activity} />
    </div>
  )
}
