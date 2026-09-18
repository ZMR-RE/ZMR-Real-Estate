import type { ReactNode } from 'react'
import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { formatDateOnly } from '../../shared/dateFormat'
import type { DocumentRecord } from '../documents/documentsQueries'
import type { Property } from './propertiesQueries'
import { PROPERTY_FIELD_GROUPS, hasFieldValue } from './propertyFieldGroups'
import { PropertyFieldGroup } from './PropertyFieldGroup'
import { PropertyIdentityHeader } from './PropertyIdentityHeader'

interface PropertySummaryProps {
  property: Property
  llcOptions: SearchableSelectOption[]
  insuranceDocuments: DocumentRecord[]
  onViewDocument: (path: string) => void
  onAddFields: (fieldKeys: string[]) => void
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

// Field-specific display formatting. Every other field in
// PROPERTY_FIELD_GROUPS is a plain string column, shown as-is.
function renderFieldValue(property: Property, key: keyof Property): ReactNode {
  switch (key) {
    case 'purchase_price':
      return currencyFormatter.format(Number(property.purchase_price))
    case 'purchase_date':
      return formatDateOnly(property.purchase_date!)
    case 'square_footage':
      return `${Number(property.square_footage).toLocaleString()} sqft`
    default:
      return property[key] as string
  }
}

// Roadmap 7.22 — Overview tab declutter. Identity fields (address,
// city/state/zip, contact email, organization type, status) pulled into
// a dedicated header; every remaining field lives inside one of
// PROPERTY_FIELD_GROUPS's labeled sub-sections, where fields without a
// real value collapse into a single "+ Add …" prompt instead of each
// showing "—". Insurance documents is handled separately here (not a
// PropertyForm field, so it can't participate in that prompt's "opens
// the edit form" behavior) and simply omitted when there are none.
export function PropertySummary({
  property,
  llcOptions,
  insuranceDocuments,
  onViewDocument,
  onAddFields,
}: PropertySummaryProps) {
  return (
    <div className="property-summary">
      <PropertyIdentityHeader property={property} llcOptions={llcOptions} />

      {PROPERTY_FIELD_GROUPS.map((group) => {
        const presentFields = group.fields
          .filter((field) => hasFieldValue(property, field.key))
          .map((field) => ({ label: field.label, value: renderFieldValue(property, field.key) }))
        const missingFields = group.fields
          .filter((field) => !hasFieldValue(property, field.key))
          .map((field) => ({ key: field.key, label: field.label }))

        if (group.id === 'insurance' && insuranceDocuments.length > 0) {
          presentFields.push({
            label: 'Insurance documents',
            value: (
              <ul>
                {insuranceDocuments.map((doc) => (
                  <li key={doc.id}>
                    {doc.link_url ? (
                      <a href={doc.link_url} target="_blank" rel="noopener noreferrer">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </a>
                    ) : (
                      <button type="button" onClick={() => onViewDocument(doc.storage_path!)}>
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ),
          })
        }

        return (
          <PropertyFieldGroup
            key={group.id}
            title={group.title}
            presentFields={presentFields}
            missingFields={missingFields}
            onAddFields={onAddFields}
          />
        )
      })}
    </div>
  )
}
