import { useState } from 'react'
import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import type { LlcInput } from '../llcs/llcsQueries'
import { PropertyTaxLedger } from '../propertyTax/PropertyTaxLedger'
import { UnitsSection } from '../units/UnitsSection'
import { PropertySpecsSection } from '../propertySpecs/PropertySpecsSection'
import { SecurityDepositsSection } from '../securityDeposits/SecurityDepositsSection'
import { PropertyForm } from './PropertyForm'
import { PropertySummary } from './PropertySummary'
import type { Property, PropertyInput } from './propertiesQueries'

interface PropertyProfileOverviewTabProps {
  property: Property
  llcOptions: SearchableSelectOption[]
  onCreateLlc: (input: LlcInput) => Promise<{ id: string } | { error: string }>
  saving: boolean
  onSave: (input: PropertyInput) => Promise<boolean>
}

// Reuses the same PropertyForm the Registry's create/edit flow uses — one
// place to edit a property's fields, not a second copy of the form.
// Roadmap 7.7 — view-by-default with an explicit Edit action, same
// pattern as the Mortgage tab's terms section and the Property Tax
// ledger. Only this core property-fields block is wrapped; the embedded
// sections below (Tax ledger, Units, Specs, Security deposits) manage
// their own view/edit state independently and are untouched here.
export function PropertyProfileOverviewTab({
  property,
  llcOptions,
  onCreateLlc,
  saving,
  onSave,
}: PropertyProfileOverviewTabProps) {
  const [isEditing, setIsEditing] = useState(false)

  const handleSave = async (input: PropertyInput) => {
    const succeeded = await onSave(input)
    if (succeeded) {
      setIsEditing(false)
    }
  }

  return (
    <>
      {isEditing ? (
        <PropertyForm
          key={property.id}
          initialValues={property}
          llcOptions={llcOptions}
          onCreateLlc={onCreateLlc}
          saving={saving}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <PropertySummary property={property} llcOptions={llcOptions} onEdit={() => setIsEditing(true)} />
      )}

      <PropertyTaxLedger propertyId={property.id} />

      <UnitsSection propertyId={property.id} />

      <PropertySpecsSection propertyId={property.id} />

      <SecurityDepositsSection propertyId={property.id} />
    </>
  )
}
