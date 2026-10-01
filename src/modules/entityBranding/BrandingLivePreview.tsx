import { useEffect, useRef, useState } from 'react'
import { PdfCanvasPreview } from '../../shared/pdf/PdfCanvasPreview'
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
  // The generated sample: its bytes (drawn on the page) and an object URL of
  // the same bytes (Open in new tab / Download).
  const [sample, setSample] = useState<{ blob: Blob; url: string } | null>(null)
  const key = JSON.stringify({ identity, stationery, kind, markers })
  // The URL currently in use; released only when replaced or on unmount, so
  // the Open/Download links never point at a released file.
  const current = useRef<string | null>(null)
  useEffect(() => () => {
    if (current.current) URL.revokeObjectURL(current.current)
  }, [])

  useEffect(() => {
    let alive = true
    const timer = setTimeout(() => {
      const d = kind === 'invoice'
        ? ({ kind, data: sampleInvoice(stationery.paymentInstructions || null, null) } as const)
        : ({ kind, data: sampleReceipt(null) } as const)
      entityDocumentBlob(identity, stationery, d, markers).then((blob) => {
        if (!alive) return
        const url = URL.createObjectURL(blob)
        const previous = current.current
        current.current = url
        setSample({ blob, url })
        if (previous) URL.revokeObjectURL(previous)
      })
    }, 250)
    return () => {
      alive = false
      clearTimeout(timer)
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
        {sample && (
          <span className="branding-preview-links">
            <a href={sample.url} target="_blank" rel="noopener">Open in new tab</a>
            <a href={sample.url} download={`sample-${kind}.pdf`}>Download sample</a>
          </span>
        )}
      </div>
      <p className="field-hint">{editing ? 'Showing your unsaved changes.' : 'Showing the saved settings.'} Sample content only — not a real tenant or charge.</p>
      {sample && <PdfCanvasPreview pdf={sample.blob} label={`Sample ${kind}`} openUrl={sample.url} filename={`sample-${kind}.pdf`} />}
      {!sample && <p className="field-hint">Preparing sample…</p>}
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
