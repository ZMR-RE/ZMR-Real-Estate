import type { ReactNode } from 'react'
import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { formatDateOnly } from '../../shared/dateFormat'
import type { Property } from './propertiesQueries'
import { PROPERTY_FIELD_GROUPS, hasFieldValue } from './propertyFieldGroups'
import { PropertyFieldGroup } from './PropertyFieldGroup'
import { PropertyIdentityHeader } from './PropertyIdentityHeader'
import { PropertyPhysicalFactsStats, hasPhysicalFactsStats } from './PropertyPhysicalFactsStats'
import { PropertyOwnershipSection } from './PropertyOwnershipSection'

interface PropertySummaryProps {
  property: Property
  llcOptions: SearchableSelectOption[]
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const LOT_SIZE_UNIT_LABELS: Record<'acres' | 'sqft', string> = {
  acres: 'acres',
  sqft: 'sq ft',
}

// Field-specific display formatting. Every other field in
// PROPERTY_FIELD_GROUPS is a plain string column, shown as-is.
function renderFieldValue(property: Property, key: keyof Property): ReactNode {
  switch (key) {
    case 'purchase_price':
      return currencyFormatter.format(Number(property.purchase_price))
    case 'purchase_date':
      return formatDateOnly(property.purchase_date!)
    case 'lot_size':
      // Roadmap 7.32 (1) — structured value takes priority; the legacy
      // free-text column (kept, never guessed at) is only a fallback
      // for a value entered before this toggle existed.
      return property.lot_size_value !== null
        ? `${Number(property.lot_size_value).toLocaleString()} ${LOT_SIZE_UNIT_LABELS[property.lot_size_unit ?? 'sqft']}`
        : property.lot_size
    case 'exterior_wall_materials':
      // Roadmap 7.33 (4) — multi-select checklist; join for a single
      // dt/dd row rather than one row per selected material.
      return property.exterior_wall_materials.join(', ')
    default:
      return property[key] as string
  }
}

// Roadmap 7.22 — Overview tab declutter. Identity fields (address,
// city/state/zip, contact email, organization type, status) pulled into
// a dedicated header; every remaining field lives inside one of
// PROPERTY_FIELD_GROUPS's labeled sub-sections. Insurance used to be one
// of these groups (with its own documents special case) before it
// became its own historical ledger (InsuranceLedger.tsx) — removed from
// here entirely, not just emptied.
//
// CLAUDE.md's Empty field visibility rule (roadmap 7.33) — a field
// without a value is omitted entirely (no "+ Add …" chip, no dash); a
// group left with zero present fields is skipped too, rather than
// rendering a bare title over nothing.
export function PropertySummary({ property, llcOptions }: PropertySummaryProps) {
  return (
    <div className="property-summary">
      <PropertyIdentityHeader property={property} llcOptions={llcOptions} />

      {PROPERTY_FIELD_GROUPS.map((group) => {
        const presentFields = group.fields
          .filter((field) => hasFieldValue(property, field.key))
          .map((field) => ({ label: field.label, value: renderFieldValue(property, field.key) }))

        // Roadmap 7.38 (1) — Physical facts gets a special layout: the
        // 4 headline stat cards first, then this group's own (now much
        // shorter) field list as a quieter "Details" sub-list — rather
        // than the plain PropertyFieldGroup every other group uses.
        // Skipped entirely (same Empty field visibility rule as
        // everywhere else) only if there's neither a stat nor a detail
        // to show, not just one or the other.
        if (group.id === 'physical-facts') {
          if (presentFields.length === 0 && !hasPhysicalFactsStats(property)) return null

          return (
            <section className="property-field-group" key={group.id}>
              <h3 className="property-field-group-title">
                <group.Icon />
                {group.title}
              </h3>
              <PropertyPhysicalFactsStats property={property} />
              {presentFields.length > 0 && (
                <div className="property-details">
                  <h4 className="property-details-title">Details</h4>
                  <dl className="field-grid">
                    {presentFields.map((field) => (
                      <div className="field" key={field.label}>
                        <dt>{field.label}</dt>
                        <dd>{field.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </section>
          )
        }

        // Roadmap 7.39 (3) — Purchase & valuation gets an "Ownership"
        // sub-list appended below its own purchase_price/purchase_date
        // fields (same "Details"-style treatment as Physical facts
        // above), rather than a full new top-level group. The group
        // itself is still skipped if purchase_price/purchase_date are
        // both empty (same as every other group's Empty field
        // visibility check) even if Ownership data exists — a property
        // with a deed on file but no purchase price/date/owner info at
        // all is an edge case this doesn't specially handle, since
        // Ownership's own presence can only be confirmed after its
        // async deed fetch resolves and would otherwise complicate the
        // group-skip decision for every other property that DOES have
        // the base fields filled in.
        if (group.id === 'purchase-valuation') {
          if (presentFields.length === 0) return null

          return (
            <section className="property-field-group" key={group.id}>
              <h3 className="property-field-group-title">
                <group.Icon />
                {group.title}
              </h3>
              <dl className="field-grid">
                {presentFields.map((field) => (
                  <div className="field" key={field.label}>
                    <dt>{field.label}</dt>
                    <dd>{field.value}</dd>
                  </div>
                ))}
              </dl>
              <PropertyOwnershipSection property={property} />
            </section>
          )
        }

        if (presentFields.length === 0) return null

        return <PropertyFieldGroup key={group.id} title={group.title} Icon={group.Icon} presentFields={presentFields} />
      })}
    </div>
  )
}
