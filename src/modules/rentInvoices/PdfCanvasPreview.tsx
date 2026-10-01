import { useEffect, useRef, useState } from 'react'

interface PdfCanvasPreviewProps {
  pdf: Blob
  label: string
  // Shown in the error state so the owner can still get to the file.
  openUrl: string
  filename: string
}

type Status = { kind: 'loading' } | { kind: 'ok'; pages: number } | { kind: 'error'; message: string }

// Draws the ACTUAL PDF bytes (the stored file for an issued invoice) into
// canvases with pdf.js, instead of embedding the browser's own PDF viewer —
// that viewer can fail silently inside a page (a blank dark panel with no
// error the page can see). Here a failure, or a page that draws nothing, is
// detected and shown with Open/Download fallbacks. pdf.js loads only when a
// preview is opened.
export function PdfCanvasPreview({ pdf, label, openUrl, filename }: PdfCanvasPreviewProps) {
  const holder = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Status>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    const tasks: { cancel: () => void }[] = []
    const host = holder.current
    const run = async () => {
      setStatus({ kind: 'loading' })
      try {
        // pdf.js's worker code runs on the page itself (it registers
        // globalThis.pdfjsWorker), so no separate worker URL has to resolve —
        // that URL was the failure on the pinned review copy. One-page
        // invoices draw in well under a second this way.
        const [lib] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs')])
        const doc = await lib.getDocument({ data: new Uint8Array(await pdf.arrayBuffer()) }).promise
        if (cancelled || !host) return
        host.replaceChildren()
        const width = Math.max(280, host.clientWidth || 600)
        const ratio = window.devicePixelRatio || 1
        let ink = 0
        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n)
          const base = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({ scale: (width / base.width) * ratio })
          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          canvas.className = 'invoice-pdf-page'
          canvas.setAttribute('role', 'img')
          canvas.setAttribute('aria-label', `${label} — page ${n} of ${doc.numPages}`)
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('This browser couldn’t create a drawing surface.')
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          const task = page.render({ canvasContext: ctx, viewport })
          tasks.push(task)
          await task.promise
          if (cancelled) return
          ink += countInk(ctx, canvas.width, canvas.height)
          host.appendChild(canvas)
        }
        // A rendered page with nothing on it is a failure, not a preview.
        if (ink === 0) throw new Error('The PDF drew as a blank page.')
        setStatus({ kind: 'ok', pages: doc.numPages })
      } catch (e) {
        if (cancelled || (e instanceof Error && e.name === 'RenderingCancelledException')) return
        host?.replaceChildren()
        setStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
      }
    }
    run()
    return () => {
      cancelled = true
      tasks.forEach((t) => t.cancel())
    }
  }, [pdf, label, attempt])

  return (
    <div className="invoice-pdf-canvas" aria-busy={status.kind === 'loading'}>
      {status.kind === 'loading' && <p className="field-hint">Drawing the PDF…</p>}
      {status.kind === 'error' && (
        <div className="invoice-callout invoice-callout--error" role="alert">
          <p>Couldn’t show the PDF here: {status.message.replace(/\.$/, '')}. The file itself is unaffected — open it in a new tab or download it.</p>
          <div className="invoice-form-actions">
            <a className="invoice-compact-button" href={openUrl} target="_blank" rel="noopener">Open in new tab</a>
            <a className="invoice-compact-button" href={openUrl} download={filename}>Download PDF</a>
            <button type="button" className="invoice-compact-button" onClick={() => setAttempt((n) => n + 1)}>Try again</button>
          </div>
        </div>
      )}
      <div ref={holder} className="invoice-pdf-pages" />
    </div>
  )
}

// Pixels that aren't (near-)white — sampled on a grid to stay fast.
function countInk(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  const data = ctx.getImageData(0, 0, w, h).data
  let ink = 0
  const step = 4 * 7
  for (let i = 0; i < data.length; i += step) {
    if (data[i] < 200 || data[i + 1] < 200 || data[i + 2] < 200) ink++
  }
  return ink
}
