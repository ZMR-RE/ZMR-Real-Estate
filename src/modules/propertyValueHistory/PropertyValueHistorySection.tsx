import { PropertyValueLedger } from './PropertyValueLedger'
import { EditableSection } from '../../shared/EditableSection'

interface PropertyValueHistorySectionProps {
  propertyId: string
  onChanged: () => Promise<void>
}

// Roadmap 7.19 — replaces the old static properties.market_value field
// with two dated, sourced logs (market value + market rent estimate),
// each tracked over time instead of overwritten in place. Rent value here
// is a market/asking-rent estimate (e.g. a Zillow rent estimate),
// distinct from tenant_units.rent_amount (8.5), which is the actual
// contracted lease rent — this is tracked "even while occupied," per the
// roadmap item's own wording. Feeds the KPI tab's Market & Financial
// Snapshot card (7.13).
//
// Roadmap 7.25 — converted to the Box interaction standard's
// EditableSection: view state shows both ledgers' lists read-only (no
// per-row Void, no always-visible "log a new entry" form — that form
// used to render unconditionally below each list, a "raw editable
// inputs shown by default" violation of the standard); clicking the
// box's own Edit reveals both ledgers' full interactive lists plus
// their log-entry forms.
export function PropertyValueHistorySection({ propertyId, onChanged }: PropertyValueHistorySectionProps) {
  return (
    <EditableSection
      title="Market & rent value history"
      view={
        <>
          <PropertyValueLedger
            propertyId={propertyId}
            metric="market_value"
            title="Market value"
            emptyMessage="No market value logged yet — log your first estimate to start tracking it over time."
            onChanged={onChanged}
            readOnly
          />
          <PropertyValueLedger
            propertyId={propertyId}
            metric="rent_value"
            title="Market rent estimate"
            emptyMessage="No rent value logged yet — log your first estimate to start tracking it over time."
            onChanged={onChanged}
            readOnly
          />
        </>
      }
      edit={(exitEditing) => (
        <>
          <PropertyValueLedger
            propertyId={propertyId}
            metric="market_value"
            title="Market value"
            emptyMessage="No market value logged yet — log your first estimate to start tracking it over time."
            onChanged={onChanged}
          />
          <PropertyValueLedger
            propertyId={propertyId}
            metric="rent_value"
            title="Market rent estimate"
            emptyMessage="No rent value logged yet — log your first estimate to start tracking it over time."
            onChanged={onChanged}
          />
          <button type="button" onClick={exitEditing}>
            Done
          </button>
        </>
      )}
    />
  )
}
