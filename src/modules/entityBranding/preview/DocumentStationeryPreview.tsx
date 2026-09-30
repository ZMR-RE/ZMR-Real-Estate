import { useEffect, useState } from 'react'
import { INVOICE_FIELDS, RECEIPT_FIELDS } from './stationeryFields'
import { SAMPLE_INVOICE, SAMPLE_RECEIPT } from './stationeryFixtures'
import { stationeryPdfBlob } from './stationeryPdf'
import type { EntityProfileFields, Stationery } from './stationeryTypes'

interface DocumentStationeryPreviewProps {
  entity: EntityProfileFields
  stationery: Stationery
}

// Live sample invoice / receipt for the current stationery, with an option
// to number every field and list where it comes from.
export function DocumentStationeryPreview({ entity, stationery }: DocumentStationeryPreviewProps) {
  const [kind, setKind] = useState<'invoice' | 'receipt'>('invoice')
  const [markers, setMarkers] = useState(true)
  const [url, setUrl] = useState<string | null>(null)
  const key = JSON.stringify({ stationery, kind, markers })

  useEffect(() => {
    let alive = true
    let created: string | null = null
    const d = kind === 'invoice' ? { kind, data: SAMPLE_INVOICE } as const : { kind, data: SAMPLE_RECEIPT } as const
    stationeryPdfBlob(entity, stationery, d, markers).then((blob) => {
      if (!alive) return
      created = URL.createObjectURL(blob)
      setUrl(created)
    })
    return () => {
      alive = false
      if (created) URL.revokeObjectURL(created)
    }
    // key captures stationery/kind/markers content
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, entity])

  const fields = kind === 'invoice' ? INVOICE_FIELDS : RECEIPT_FIELDS
  // `?frame=off` skips the embedded PDF viewer (used for automated browser
  // checks, which the viewer plugin interrupts). Owners see the normal page.
  const showFrame = !new URLSearchParams(window.location.search).has('frame')

  return (
    <section className="card branding-preview" aria-label="Sample documents">
      <div className="branding-preview-bar">
        <span role="group" aria-label="Sample document">
          <button type="button" aria-pressed={kind === 'invoice'} onClick={() => setKind('invoice')}>Invoice</button>
          <button type="button" aria-pressed={kind === 'receipt'} onClick={() => setKind('receipt')}>Receipt</button>
        </span>
        <label className="branding-toggle">
          <input type="checkbox" checked={markers} onChange={(e) => setMarkers(e.target.checked)} /> Number each field
        </label>
        {url && <a href={url} download={`sample-${kind}${markers ? '-field-sources' : ''}.pdf`}>Download sample</a>}
      </div>
      {url && showFrame && <iframe className="branding-pdf-frame" src={url} title={`Sample ${kind}`} />}
      {!url && <p className="field-hint">Preparing sample…</p>}

      <h3 className="property-details-title">Where each field comes from</h3>
      <div className="table-scroll">
        <table className="branding-sources">
          <thead>
            <tr><th scope="col">#</th><th scope="col">Field</th><th scope="col">Comes from</th><th scope="col">Status</th></tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.n}>
                <td><span className="branding-marker">{f.n}</span></td>
                <td>{f.field}</td>
                <td>{f.source}</td>
                <td><span className={`status-badge ${f.status === 'Proposed' ? 'status-badge-warning' : 'status-badge-neutral'}`}>{f.status === 'Record' ? 'From the record' : f.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="field-hint">Issued documents keep a snapshot of every issuer and branding value (including the logo version) — changing these settings later never alters an issued PDF.</p>
    </section>
  )
}
