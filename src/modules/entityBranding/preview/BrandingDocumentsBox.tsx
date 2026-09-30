import { useState } from 'react'
import { EditableSection } from '../../../shared/EditableSection'
import { SAMPLE_LOGO } from './sampleLogo'
import { DEFAULT_COLORS, resolveColors, ROLE_LABEL } from './stationeryLogic'
import type { ColorRole, Stationery } from './stationeryTypes'

interface BrandingDocumentsBoxProps {
  stationery: Stationery
  onSave: (next: Stationery) => void
}

const MAX_LOGO_BYTES = 1_000_000

function readLogo(file: File): Promise<Stationery['logo'] | string> {
  return new Promise((resolve) => {
    if (!['image/png', 'image/jpeg'].includes(file.type)) return resolve('Use a PNG or JPG logo.')
    if (file.size > MAX_LOGO_BYTES) return resolve('Logo must be 1 MB or smaller.')
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      const img = new Image()
      img.onload = () => resolve({ dataUrl, format: file.type === 'image/png' ? 'PNG' : 'JPEG', width: img.naturalWidth, height: img.naturalHeight, name: file.name })
      img.onerror = () => resolve('That image couldn’t be read.')
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  })
}

// PROPOSED box on the EXISTING entity profile: this entity's document
// stationery. Non-saving preview — Save only updates the preview.
export function BrandingDocumentsBox({ stationery, onSave }: BrandingDocumentsBoxProps) {
  const [draft, setDraft] = useState<Stationery>(stationery)
  const [logoError, setLogoError] = useState<string | null>(null)
  const { warnings } = resolveColors(draft)
  const setColor = (role: ColorRole, value: string) => setDraft({ ...draft, colors: { ...draft.colors, [role]: value || undefined } })
  const setDefault = <K extends keyof Stationery['defaults']>(k: K, v: Stationery['defaults'][K]) => setDraft({ ...draft, defaults: { ...draft.defaults, [k]: v } })
  const colorCount = Object.values(stationery.colors).filter(Boolean).length

  const view = (
    <dl className="field-grid">
      <div className="field"><dt>Logo</dt><dd>{stationery.logo ? <img className="branding-logo-thumb" src={stationery.logo.dataUrl} alt="Entity logo" /> : 'None'}</dd></div>
      <div className="field">
        <dt>Document colours</dt>
        <dd className="branding-swatches">
          {colorCount === 0 ? 'Standard colours' : (Object.keys(DEFAULT_COLORS) as ColorRole[]).filter((r) => stationery.colors[r]).map((r) => <span key={r} className="branding-swatch" style={{ background: stationery.colors[r] }} title={ROLE_LABEL[r]} />)}
        </dd>
      </div>
      {stationery.contact.phone && <div className="field"><dt>Phone on documents</dt><dd>{stationery.contact.phone}</dd></div>}
      {stationery.contact.website && <div className="field"><dt>Website on documents</dt><dd>{stationery.contact.website}</dd></div>}
      <div className="field"><dt>Paper size</dt><dd>{stationery.defaults.paperSize === 'a4' ? 'A4' : 'US Letter'}</dd></div>
      {stationery.defaults.invoiceNote && <div className="field branding-field-wide"><dt>Default invoice note</dt><dd>{stationery.defaults.invoiceNote}</dd></div>}
      {stationery.defaults.receiptNote && <div className="field branding-field-wide"><dt>Default receipt note</dt><dd>{stationery.defaults.receiptNote}</dd></div>}
      {stationery.defaults.documentFooter && <div className="field branding-field-wide"><dt>Document footer</dt><dd>{stationery.defaults.documentFooter}</dd></div>}
    </dl>
  )

  const edit = (exit: () => void) => (
    <form className="branding-form" onSubmit={(e) => { e.preventDefault(); onSave(draft); exit() }}>
      <fieldset className="branding-fieldset">
        <legend>Logo</legend>
        {draft.logo && <img className="branding-logo-thumb" src={draft.logo.dataUrl} alt="Current logo" />}
        <input type="file" accept="image/png,image/jpeg" aria-label="Upload logo (PNG or JPG, up to 1 MB)" onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const r = await readLogo(file)
          if (typeof r === 'string') setLogoError(r)
          else { setLogoError(null); setDraft({ ...draft, logo: r }) }
        }} />
        <div className="branding-actions">
          <button type="button" onClick={() => setDraft({ ...draft, logo: SAMPLE_LOGO })}>Use sample logo</button>
          {draft.logo && <button type="button" onClick={() => setDraft({ ...draft, logo: null })}>Remove logo</button>}
        </div>
        {logoError && <p className="branding-warning" role="alert">{logoError}</p>}
        <p className="field-hint">PNG or JPG, up to 1 MB. Placed top-left, scaled to fit 150 × 48 pt.</p>
      </fieldset>

      <fieldset className="branding-fieldset">
        <legend>Document colours (optional)</legend>
        {(Object.keys(DEFAULT_COLORS) as ColorRole[]).map((role) => (
          <div key={role} className="branding-color-row">
            <label htmlFor={`color-${role}`}>{ROLE_LABEL[role]}</label>
            <input type="color" aria-label={`${role} colour picker`} value={draft.colors[role] ?? DEFAULT_COLORS[role]} onChange={(e) => setColor(role, e.target.value.toUpperCase())} />
            <input id={`color-${role}`} value={draft.colors[role] ?? ''} placeholder={`${DEFAULT_COLORS[role]} (standard)`} onChange={(e) => setColor(role, e.target.value.trim())} />
          </div>
        ))}
        {warnings.map((w) => <p key={w} className="branding-warning">{w}</p>)}
        <p className="field-hint">Only this entity’s invoices and receipts use these colours — the dashboard’s own theme never changes. Leave blank for the standard colours.</p>
      </fieldset>

      <fieldset className="branding-fieldset">
        <legend>Contact details on documents</legend>
        <label htmlFor="branding-phone">Phone</label>
        <input id="branding-phone" value={draft.contact.phone} onChange={(e) => setDraft({ ...draft, contact: { ...draft.contact, phone: e.target.value } })} />
        <label htmlFor="branding-web">Website</label>
        <input id="branding-web" value={draft.contact.website} onChange={(e) => setDraft({ ...draft, contact: { ...draft.contact, website: e.target.value } })} />
        <p className="field-hint">Name and address come from Identity; reply-to email and payment instructions from Invoicing.</p>
      </fieldset>

      <fieldset className="branding-fieldset">
        <legend>Document defaults</legend>
        <label htmlFor="branding-paper">Paper size</label>
        <select id="branding-paper" value={draft.defaults.paperSize} onChange={(e) => setDefault('paperSize', e.target.value as 'letter' | 'a4')}>
          <option value="letter">US Letter</option>
          <option value="a4">A4</option>
        </select>
        <label><input type="checkbox" checked={draft.defaults.showLegalName} onChange={(e) => setDefault('showLegalName', e.target.checked)} /> Show the legal name under the display name</label>
        <label htmlFor="branding-inv-note">Default invoice note</label>
        <textarea id="branding-inv-note" value={draft.defaults.invoiceNote} onChange={(e) => setDefault('invoiceNote', e.target.value)} />
        <label htmlFor="branding-rct-note">Default receipt note</label>
        <textarea id="branding-rct-note" value={draft.defaults.receiptNote} onChange={(e) => setDefault('receiptNote', e.target.value)} />
        <label htmlFor="branding-footer">Document footer</label>
        <input id="branding-footer" value={draft.defaults.documentFooter} onChange={(e) => setDefault('documentFooter', e.target.value)} />
      </fieldset>

      <p className="branding-warning">Preview only — Save updates the sample documents; nothing is stored.</p>
      <div className="branding-actions">
        <button type="submit">Save</button>
        <button type="button" onClick={exit}>Cancel</button>
      </div>
    </form>
  )

  return <EditableSection title="Branding & documents (proposed)" defaultOpen view={view} edit={edit} onEditStart={() => { setDraft(stationery); setLogoError(null) }} />
}
