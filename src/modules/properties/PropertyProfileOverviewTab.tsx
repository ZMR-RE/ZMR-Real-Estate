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
import { VendorEstimatesSection } from '../vendorEstimates/VendorEstimatesSection'
import { PropertyOwnershipInterestsSection } from './PropertyOwnershipInterestsSection'
import { usePropertyOwnershipInterests } from './usePropertyOwnershipInterests'
import { resolveOwnershipAuthority } from '../llcs/ownershipInterestsQueries'
import { PropertyForm } from './PropertyForm'
import { PropertySaveConflictNotice } from './PropertySaveConflictNotice'
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
  // Batch I5 — stale-edit protection state from usePropertyProfile.
  conflict: Property | null
  formResetKey: number
  onKeepEditingAfterConflict: () => void
  onDiscardDraftAndLoadLatest: () => void
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
// Consolidated Overview layout fix — reverts the two-column grouping:
// every secondary box is full-width, single-column, stacked, same
// treatment as Specs & measurements/Utility records/Security deposits/
// Units already had. The 2-column grid (and its later explicit-column-
// placement fix) is gone along with it; see git history if that layout
// needs revisiting.
export function PropertyProfileOverviewTab({
  property,
  llcOptions,
  onCreateLlc,
  holdingCompanyOptions,
  onCreateHoldingCompany,
  onValueHistoryChanged,
  saving,
  onSave,
  conflict,
  formResetKey,
  onKeepEditingAfterConflict,
  onDiscardDraftAndLoadLatest,
}: PropertyProfileOverviewTabProps) {
  // Package 1 §2 — property.llc_id is a legacy pointer, not confirmed
  // ownership, except in the one case (a single, complete, kind-
  // resolved current owner) resolveOwnershipAuthority names. Financial
  // accounts scoping has real functional consequences (which account
  // rows a user sees), so it must never fall back to the raw legacy
  // pointer the way a display label safely could.
  const { interests, completeness } = usePropertyOwnershipInterests(property.id)
  const ownershipAuthority = resolveOwnershipAuthority(interests, completeness, property.llc_id)
  const authoritativeLlcId = ownershipAuthority.authoritative ? ownershipAuthority.llcId : null
  // Roadmap 7.40 — the Financial accounts box also shows this LLC's
  // shared accounts (if any), distinguishably; llcOptions already
  // carries the same "Name (Holding Co)" label used everywhere else an
  // LLC is displayed, so no separate lookup/query is needed for it.
  const llcLabel = authoritativeLlcId ? (llcOptions.find((o) => o.id === authoritativeLlcId)?.label ?? null) : null

  return (
    <div className="property-overview-grid">
      <EditableSection
        title="Property information"
        defaultOpen
        view={<PropertySummary property={property} llcOptions={llcOptions} />}
        edit={(exitEditing) => (
          <>
            {/* Batch I5 — on a refused save the box stays in Edit (onSave
                returns false), the draft stays in the still-mounted form
                below (its key only changes on an explicit discard), and
                this notice explains what happened and offers the two
                deliberate ways forward. */}
            {conflict && (
              <PropertySaveConflictNotice
                latest={conflict}
                onKeepEditing={onKeepEditingAfterConflict}
                onDiscardAndReload={onDiscardDraftAndLoadLatest}
              />
            )}
            <PropertyForm
              key={`${property.id}-${formResetKey}`}
              propertyId={property.id}
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
          </>
        )}
      />

      <PropertyOwnershipInterestsSection propertyId={property.id} llcOptions={llcOptions} />

      <FinancialAccountsSection propertyId={property.id} llcId={authoritativeLlcId} llcLabel={llcLabel} />

      <InsuranceLedger propertyId={property.id} />

      <PropertyValueHistorySection propertyId={property.id} onChanged={onValueHistoryChanged} />

      <PropertyTaxLedger propertyId={property.id} />

      <CollapsibleSection title="Tenants">
        <PropertyTenantsOverview propertyId={property.id} />
      </CollapsibleSection>

      <PropertySpecsSection propertyId={property.id} />

      <UtilityRecordsSection propertyId={property.id} />

      <SecurityDepositsSection propertyId={property.id} />

      <VendorEstimatesSection propertyId={property.id} />

      <UnitsSection propertyId={property.id} />
    </div>
  )
}
