import { useState } from 'react'
import { validateBrandingContact } from './brandingMapping'
import { DEFAULT_COLORS, resolveColors, ROLE_LABEL } from './stationeryLogic'
import type { ColorRole, Stationery } from './stationeryTypes'
import type { PendingLogo } from './useEntityBranding'

interface BrandingDocumentsFormProps {
  draft: Stationery
  onChange: (next: Stationery) => void
  onPendingLogo: (logo: PendingLogo | null) => void
  saving: boolean
  onSave: () => void
  onCancel: () => void
}

const MAX_LOGO_BYTES = 1_000_000

function readLogo(file: File): Promise<PendingLogo | string> {
  return new Promise((resolve) => {
    if (!['image/png', 'image/jpeg'].includes(file.type)) return resolve('Use a PNG or JPG logo.')
    if (file.size > MAX_LOGO_BYTES) return resolve('Logo must be 1 MB or smaller.')
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      const img = new Image()
      img.onload = () => resolve({ dataUrl, format: file.type === 'image/png' ? 'PNG' : 'JPEG', width: img.naturalWidth, height: img.naturalHeight, name: file.name, file })
      img.onerror = () => resolve('That image couldn’t be read.')
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  })
}

export function BrandingDocumentsForm({ draft, onChange, onPendingLogo, saving, onSave, onCancel }: BrandingDocumentsFormProps) {
  const [logoError, setLogoError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const { warnings } = resolveColors(draft)
  const contactErrors = validateBrandingContact(draft)
  const set = (patch: Partial<Stationery>) => onChange({ ...draft, ...patch })
  const setColor = (role: ColorRole, value: string) => set({ colors: { ...draft.colors, [role]: value.trim() ? value.trim().toUpperCase() : undefined } })
  const setDefault = <K extends keyof Stationery['defaults']>(k: K, v: Stationery['defaults'][K]) => set({ defaults: { ...draft.defaults, [k]: v } })

  return (
    <form
      className="branding-form"
      onSubmit={(e) => {
        e.preventDefault()
        setTouched(true)
        if (warnings.length === 0 && contactErrors.length === 0) onSave()
      }}
    >
      <fieldset className="branding-fieldset">
        <legend>Logo</legend>
        {draft.logo && <img className="branding-logo-thumb" src={draft.logo.dataUrl} alt="Logo" />}
        <input
          type="file"
          accept="image/png,image/jpeg"
          aria-label="Upload logo (PNG or JPG, up to 1 MB)"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const r = await readLogo(file)
            if (typeof r === 'string') return setLogoError(r)
            setLogoError(null)
            onPendingLogo(r)
            set({ logo: r })
          }}
        />
        {draft.logo && (
          <button type="button" onClick={() => { onPendingLogo(null); set({ logo: null }) }}>
            Remove logo
          </button>
        )}
        {logoError && <p className="branding-warning" role="alert">{logoError}</p>}
        <p className="field-hint">PNG or JPG, up to 1 MB. Each upload is kept as a new version; issued documents keep the one they used.</p>
      </fieldset>

      <fieldset className="branding-fieldset">
        <legend>Document colours (optional)</legend>
        {(Object.keys(DEFAULT_COLORS) as ColorRole[]).map((role) => (
          <div key={role} className="branding-color-row">
            <label htmlFor={`color-${role}`}>{ROLE_LABEL[role]}</label>
            <input type="color" aria-label={`${role} colour picker`} value={draft.colors[role] ?? DEFAULT_COLORS[role]} onChange={(e) => setColor(role, e.target.value)} />
            <input id={`color-${role}`} value={draft.colors[role] ?? ''} placeholder={`${DEFAULT_COLORS[role]} (standard)`} onChange={(e) => setColor(role, e.target.value)} />
          </div>
        ))}
        {warnings.map((w) => <p key={w} className="branding-warning">{w}</p>)}
        <p className="field-hint">Used only on their documents — the dashboard’s own theme never changes. Blank = standard colours.</p>
      </fieldset>

      <fieldset className="branding-fieldset">
        <legend>Issuer and contact details</legend>
        <label htmlFor="branding-reply">Reply-to email</label>
        <input id="branding-reply" type="email" value={draft.contact.replyTo} onChange={(e) => set({ contact: { ...draft.contact, replyTo: e.target.value } })} />
        <label htmlFor="branding-phone">Phone</label>
        <input id="branding-phone" value={draft.contact.phone} onChange={(e) => set({ contact: { ...draft.contact, phone: e.target.value } })} />
        <label htmlFor="branding-web">Website</label>
        <input id="branding-web" value={draft.contact.website} onChange={(e) => set({ contact: { ...draft.contact, website: e.target.value } })} />
        <label htmlFor="branding-pay">Default payment instructions</label>
        <textarea id="branding-pay" value={draft.paymentInstructions} onChange={(e) => set({ paymentInstructions: e.target.value })} />
        <p className="field-hint">Name and address come from Identity on their profile. Payment instructions print on their invoices.</p>
      </fieldset>

      <fieldset className="branding-fieldset">
        <legend>Document defaults</legend>
        <label htmlFor="branding-paper">Paper size</label>
        <select id="branding-paper" value={draft.defaults.paperSize} onChange={(e) => setDefault('paperSize', e.target.value as 'letter' | 'a4')}>
          <option value="letter">US Letter</option>
          <option value="a4">A4</option>
        </select>
        <label>
          <input type="checkbox" checked={draft.defaults.showLegalName} onChange={(e) => setDefault('showLegalName', e.target.checked)} /> Show the legal name under the display name
        </label>
        <label htmlFor="branding-inv-note">Default invoice note</label>
        <textarea id="branding-inv-note" value={draft.defaults.invoiceNote} onChange={(e) => setDefault('invoiceNote', e.target.value)} />
        <label htmlFor="branding-rct-note">Default receipt note</label>
        <textarea id="branding-rct-note" value={draft.defaults.receiptNote} onChange={(e) => setDefault('receiptNote', e.target.value)} />
        <label htmlFor="branding-footer">Document footer</label>
        <input id="branding-footer" value={draft.defaults.documentFooter} onChange={(e) => setDefault('documentFooter', e.target.value)} />
      </fieldset>

      {touched && contactErrors.map((er) => <p key={er} className="branding-warning" role="alert">{er}</p>)}
      <p className="field-hint">Saving affects documents issued from now on. Already-issued documents keep the branding they were issued with.</p>
      <div className="branding-actions">
        <button type="submit" disabled={saving}>Save</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
