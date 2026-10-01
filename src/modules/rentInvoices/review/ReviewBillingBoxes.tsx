import { EntityInvoicingSection } from '../../billingSettings/EntityInvoicingSection'
import { PropertyBillingSettingsSection } from '../../billingSettings/PropertyBillingSettingsSection'

// The real Entity › Invoicing and Property › Billing settings boxes, with
// fictional data. Component-level: the rest of the entity and property
// profile pages isn't rendered here.
export function ReviewBillingBoxes() {
  return (
    <div className="property-overview-grid">
      <h1>Invoicing and billing settings (harness: boxes only)</h1>
      <EntityInvoicingSection entityId="ent-a" />
      <PropertyBillingSettingsSection propertyId="prop-410" />
      <EntityInvoicingSection entityId="ent-pp" />
      <PropertyBillingSettingsSection propertyId="prop-9" />
    </div>
  )
}
