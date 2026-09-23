import type { Property } from './propertiesQueries'
import { usePropertyDeedDocument } from './usePropertyDeedDocument'
import { OwnershipIcon } from './propertyFieldGroupIcons'

interface PropertyOwnershipSectionProps {
  property: Property
}

// Roadmap 7.39 (3) — Ownership sub-list inside Purchase & valuation's
// View mode: Owner name, Contact email (moved here from the identity
// header, where it used to ride along as a lone line — now sits
// alongside the new Contact phone rather than separately), Contact
// phone, Deed document. The deed's own presence is only knowable after
// its async fetch resolves, unlike the 3 plain text fields
// (synchronously known from `property`), so this whole section waits
// for that fetch before deciding whether to render at all — a "deed
// uploaded but no owner name on file yet" property must still show its
// deed link, not just properties with text fields filled in.
//
// Roadmap 7.45 (1) — heading upgraded from the quiet, icon-less
// .property-details-title (originally borrowed from Physical facts'
// "Details" sub-list) to the same bold/accent .property-field-group-
// title + icon treatment as its sibling subsections (Physical facts,
// Exterior information) — it was reading as visually subordinate to
// them despite being an equal-weight subsection of Property
// Information, not a quieter footnote the way "Details" genuinely is.
export function PropertyOwnershipSection({ property }: PropertyOwnershipSectionProps) {
  const { document, loading, view } = usePropertyDeedDocument(property.id)

  if (loading) return null

  const hasTextField = property.owner_name !== null || property.contact_phone !== null || property.contact_email !== null
  if (!hasTextField && !document) return null

  return (
    <div className="property-details">
      <h4 className="property-field-group-title">
        <OwnershipIcon />
        Ownership
      </h4>
      <dl className="field-grid">
        {property.owner_name !== null && (
          <div className="field">
            <dt>Owner name</dt>
            <dd>{property.owner_name}</dd>
          </div>
        )}
        {property.contact_email !== null && (
          <div className="field">
            <dt>Contact email</dt>
            <dd>{property.contact_email}</dd>
          </div>
        )}
        {property.contact_phone !== null && (
          <div className="field">
            <dt>Contact phone</dt>
            <dd>{property.contact_phone}</dd>
          </div>
        )}
        {document && (
          <div className="field">
            <dt>Deed document</dt>
            <dd>
              <button type="button" onClick={view}>
                View deed document
              </button>
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}
