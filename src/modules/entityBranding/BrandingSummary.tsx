import { DEFAULT_COLORS, ROLE_LABEL } from './stationeryLogic'
import type { ColorRole, Stationery } from './stationeryTypes'

// View-only summary of an entity's saved stationery (empty fields omitted).
export function BrandingSummary({ stationery: s }: { stationery: Stationery }) {
  const roles = (Object.keys(DEFAULT_COLORS) as ColorRole[]).filter((r) => s.colors[r])
  return (
    <dl className="field-grid">
      {s.logo && <div className="field"><dt>Logo</dt><dd><img className="branding-logo-thumb" src={s.logo.dataUrl} alt="Logo" /></dd></div>}
      <div className="field">
        <dt>Document colours</dt>
        <dd className="branding-swatches">
          {roles.length === 0 ? 'Standard colours' : roles.map((r) => <span key={r} className="branding-swatch" style={{ background: s.colors[r] }} title={`${ROLE_LABEL[r]}: ${s.colors[r]}`} />)}
        </dd>
      </div>
      {s.contact.replyTo && <div className="field"><dt>Reply-to email</dt><dd>{s.contact.replyTo}</dd></div>}
      {s.contact.phone && <div className="field"><dt>Phone</dt><dd>{s.contact.phone}</dd></div>}
      {s.contact.website && <div className="field"><dt>Website</dt><dd>{s.contact.website}</dd></div>}
      <div className="field"><dt>Paper size</dt><dd>{s.defaults.paperSize === 'a4' ? 'A4' : 'US Letter'}</dd></div>
      {s.paymentInstructions && <div className="field branding-field-wide"><dt>Default payment instructions</dt><dd>{s.paymentInstructions}</dd></div>}
      {s.defaults.invoiceNote && <div className="field branding-field-wide"><dt>Default invoice note</dt><dd>{s.defaults.invoiceNote}</dd></div>}
      {s.defaults.receiptNote && <div className="field branding-field-wide"><dt>Default receipt note</dt><dd>{s.defaults.receiptNote}</dd></div>}
      {s.defaults.documentFooter && <div className="field branding-field-wide"><dt>Document footer</dt><dd>{s.defaults.documentFooter}</dd></div>}
    </dl>
  )
}
