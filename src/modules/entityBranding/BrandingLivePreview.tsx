import { useEffect, useState } from 'react'
import { sampleInvoice, sampleReceipt } from './sampleDocuments'
import { INVOICE_FIELDS, RECEIPT_FIELDS } from './stationeryFields'
import { entityDocumentBlob } from './stationeryPdf'
import type { EntityIdentity, Stationery } from './stationeryTypes'

interface BrandingLivePreviewProps {
  identity: EntityIdentity
  stationery: Stationery
  editing: boolean
}

// Live sample invoice / receipt for this entity's stationery (updates as the
// form changes). Sample content is fictional and never stored.
export function BrandingLivePreview({ identity, stationery, editing }: BrandingLivePreviewProps) {
  const [kind, setKind] = useState<'invoice' | 'receipt'>('invoice')
  const [markers, setMarkers] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const key = JSON.stringify({ identity, stationery, kind, markers })
  // `?frame=off` skips the embedded viewer (automated checks only).
  const showFrame = !new URLSearchParams(window.location.search).has('frame')

  useEffect(() => {
    let alive = true
    let created: string | null = null
    const timer = setTimeout(() => {
      const d = kind === 'invoice'
        ? ({ kind, data: sampleInvoice(stationery.paymentInstructions || null, null) } as const)
        : ({ kind, data: sampleReceipt(null) } as const)
      entityDocumentBlob(identity, stationery, d, markers).then((blob) => {
        if (!alive) return
        created = URL.createObjectURL(blob)
        setUrl(created)
      })
    }, 250)
    return () => {
      alive = false
      clearTimeout(timer)
      if (created) URL.revokeObjectURL(created)
    }
    // key captures the content of identity/stationery/kind/markers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const fields = kind === 'invoice' ? INVOICE_FIELDS : RECEIPT_FIELDS
  return (
    <section className="card branding-preview" aria-label="Live document preview">
      <div className="branding-preview-bar">
        <span role="group" aria-label="Sample document">
          <button type="button" aria-pressed={kind === 'invoice'} onClick={() => setKind('invoice')}>Invoice</button>
          <button type="button" aria-pressed={kind === 'receipt'} onClick={() => setKind('receipt')}>Receipt</button>
        </span>
        <label className="branding-toggle">
          <input type="checkbox" checked={markers} onChange={(e) => setMarkers(e.target.checked)} /> Number each field
        </label>
        {url && <a href={url} download={`sample-${kind}.pdf`}>Download sample</a>}
      </div>
      <p className="field-hint">{editing ? 'Showing your unsaved changes.' : 'Showing the saved settings.'} Sample content only — not a real tenant or charge.</p>
      {url && showFrame && <iframe className="branding-pdf-frame" src={url} title={`Sample ${kind}`} />}
      {!url && <p className="field-hint">Preparing sample…</p>}
      {markers && (
        <div className="table-scroll">
          <table className="branding-sources">
            <thead>
              <tr><th scope="col">#</th><th scope="col">Field</th><th scope="col">Comes from</th></tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.n}><td><span className="branding-marker">{f.n}</span></td><td>{f.field}</td><td>{f.source}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
