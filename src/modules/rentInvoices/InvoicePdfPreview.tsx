import { useEffect, useState } from 'react'
import type { InvoiceDocumentModel } from './invoiceDocument'
import { invoicePdfBlob } from './invoicePdf'
import { getStoredInvoicePdf, openStoredInvoicePdf } from './rentInvoicesQueries'

interface InvoicePdfPreviewProps {
  model: InvoiceDocumentModel
  // Issued invoices: show the STORED file (checked against its recorded
  // digest), not a fresh render.
  issuedInvoiceId?: string
  // Tells the parent whether an issued invoice has its stored PDF.
  onStoredChecked?: (found: boolean) => void
}

export function InvoicePdfPreview({ model, issuedInvoiceId, onStoredChecked }: InvoicePdfPreviewProps) {
  const [url, setUrl] = useState<string | null>(null)
  // The embedded viewer loads on request (lighter on phones).
  const [showFrame, setShowFrame] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  // Re-render only when the document's CONTENT changes, not on every parent
  // render (the model object is rebuilt each time).
  const contentKey = JSON.stringify(model)

  useEffect(() => {
    let created: string | null = null
    let alive = true
    const load = async () => {
      if (issuedInvoiceId) {
        const stored = await getStoredInvoicePdf(issuedInvoiceId)
        const detail = stored.data?.detail
        if (alive) onStoredChecked?.(!!detail)
        if (!detail) {
          if (alive) setStatus('No stored PDF yet for this issued invoice.')
          return
        }
        const opened = await openStoredInvoicePdf(detail.storage_path, detail.sha256)
        if (!alive) return
        if ('error' in opened && opened.error) return setStatus(opened.error.message)
        if ('url' in opened && opened.url) {
          created = opened.url
          setUrl(opened.url)
          setStatus(opened.matches === false ? 'Warning: the stored file doesn’t match the fingerprint recorded when it was issued.' : 'Stored PDF — matches the fingerprint recorded at issue.')
        }
        return
      }
      const blob = await invoicePdfBlob(JSON.parse(contentKey) as InvoiceDocumentModel)
      if (!alive) return
      created = URL.createObjectURL(blob)
      setUrl(created)
      setStatus(null)
    }
    load()
    return () => {
      alive = false
      if (created) URL.revokeObjectURL(created)
    }
    // onStoredChecked is a notification only; re-running on its identity
    // would reload the file on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey, issuedInvoiceId])

  return (
    <div className="invoice-pdf-preview">
      <div className="invoice-pdf-preview-bar">
        <span className="field-hint">{status ?? (model.isDraft ? 'Draft preview — not numbered, not issued, not sent.' : model.filename)}</span>
        {url && (
          <span className="invoice-form-actions">
            <button type="button" className="invoice-compact-button" aria-expanded={showFrame} onClick={() => setShowFrame(!showFrame)}>
              {showFrame ? 'Hide preview' : 'Preview PDF'}
            </button>
            <a href={url} download={model.filename}>Download PDF</a>
          </span>
        )}
      </div>
      {!url && <p className="field-hint">Preparing PDF…</p>}
      {url && showFrame && <iframe className="invoice-pdf-frame" src={url} title={`PDF preview: ${model.filename}`} />}
    </div>
  )
}
