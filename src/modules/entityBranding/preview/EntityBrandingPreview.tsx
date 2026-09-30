import { useState } from 'react'
import { CollapsibleSection } from '../../../shared/CollapsibleSection'
import { BrandingDocumentsBox } from './BrandingDocumentsBox'
import { DocumentStationeryPreview } from './DocumentStationeryPreview'
import { SAMPLE_ENTITY, SAMPLE_STATIONERY } from './stationeryFixtures'
import type { Stationery } from './stationeryTypes'

// NON-SAVING PREVIEW of the proposed "Branding & documents" box on the
// EXISTING entity profile — the same issuer record, not a second one. The
// Identity and Invoicing boxes shown here already exist and are unchanged.
export function EntityBrandingPreview() {
  const [stationery, setStationery] = useState<Stationery>(SAMPLE_STATIONERY)
  const e = SAMPLE_ENTITY

  return (
    <div className="branding-page">
      <div className="page-header-row">
        <h1>{e.displayName ?? e.legalName}</h1>
      </div>
      <p className="branding-notice" role="note">
        <strong>Proposal preview.</strong> Fictional entity. The Branding & documents box is awaiting your numbered approval; nothing is saved and no issued document changes.
      </p>
      <div className="branding-layout">
        <div className="branding-settings">
          <CollapsibleSection title="Identity (existing box — unchanged)">
            <dl className="field-grid">
              <div className="field"><dt>Legal name</dt><dd>{e.legalName}</dd></div>
              {e.displayName && <div className="field"><dt>Display name</dt><dd>{e.displayName}</dd></div>}
              <div className="field"><dt>Mailing address</dt><dd>{e.mailingAddress}, {e.mailingCity}, {e.mailingState} {e.mailingZip}</dd></div>
            </dl>
          </CollapsibleSection>
          <CollapsibleSection title="Invoicing (existing box — unchanged)">
            <dl className="field-grid">
              {e.invoiceCode && <div className="field"><dt>Invoice code</dt><dd>{e.invoiceCode}</dd></div>}
              {e.replyTo && <div className="field"><dt>Reply-to email</dt><dd>{e.replyTo}</dd></div>}
              {e.paymentInstructions && <div className="field"><dt>Payment instructions</dt><dd>{e.paymentInstructions}</dd></div>}
            </dl>
          </CollapsibleSection>
          <BrandingDocumentsBox stationery={stationery} onSave={setStationery} />
        </div>
        <DocumentStationeryPreview entity={e} stationery={stationery} />
      </div>
    </div>
  )
}
