import { useEffect, useRef, useState } from 'react'
import './pdfPreview.css'

interface PdfCanvasPreviewProps {
  // The actual PDF bytes to show (never a re-render of something else).
  pdf: Blob
  // Accessible name for the drawn pages, e.g. "Sample invoice".
  label: string
  // Object URL of the same bytes, for the Open/Download fallbacks.
  openUrl: string
  filename: string
}

type Status = { kind: 'loading' } | { kind: 'ok'; pages: number } | { kind: 'error'; message: string }

// Draws the actual PDF bytes into canvases with pdf.js instead of embedding
// the browser's own PDF viewer, which can stay as a blank dark panel inside
// a page without any error the page can see. A failure — or a page that
// draws nothing — is shown with Open/Download fallbacks and Try again.
// pdf.js and its worker code load only when a preview is first shown; the
// worker code runs on the page (it registers globalThis.pdfjsWorker), so no
// separate worker URL has to resolve.
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
        const [lib] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs')])
        const doc = await lib.getDocument({ data: new Uint8Array(await pdf.arrayBuffer()) }).promise
        if (cancelled || !host) return
        const width = Math.max(260, host.clientWidth || 600)
        const ratio = window.devicePixelRatio || 1
        const pages: HTMLCanvasElement[] = []
        let ink = 0
        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n)
          const base = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({ scale: (width / base.width) * ratio })
          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          canvas.className = 'pdf-preview-page'
          canvas.setAttribute('role', 'img')
          canvas.setAttribute('aria-label', `${label} — page ${n} of ${doc.numPages}`)
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('this browser couldn’t create a drawing surface')
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          const task = page.render({ canvasContext: ctx, viewport })
          tasks.push(task)
          await task.promise
          if (cancelled) return
          ink += countInk(ctx, canvas.width, canvas.height)
          pages.push(canvas)
        }
        // A page with nothing drawn on it is a failure, not a preview.
        if (ink === 0) throw new Error('the PDF drew as a blank page')
        // Swap in the new pages only once they're complete, so the previous
        // pages stay visible while a changed document redraws.
        host.replaceChildren(...pages)
        setStatus({ kind: 'ok', pages: doc.numPages })
      } catch (e) {
        if (cancelled || (e instanceof Error && e.name === 'RenderingCancelledException')) return
        host?.replaceChildren()
        setStatus({ kind: 'error', message: (e instanceof Error ? e.message : String(e)).replace(/\.$/, '') })
      }
    }
    run()
    return () => {
      cancelled = true
      tasks.forEach((t) => t.cancel())
    }
  }, [pdf, label, attempt])

  return (
    <div className="pdf-preview" aria-busy={status.kind === 'loading'}>
      {status.kind === 'loading' && <p className="field-hint pdf-preview-status">Drawing the PDF…</p>}
      {status.kind === 'error' && (
        <div className="pdf-preview-error" role="alert">
          <p>Couldn’t show the PDF here: {status.message}. The file itself is unaffected — open it in a new tab or download it.</p>
          <div className="pdf-preview-actions">
            <a href={openUrl} target="_blank" rel="noopener">Open in new tab</a>
            <a href={openUrl} download={filename}>Download PDF</a>
            <button type="button" onClick={() => setAttempt((n) => n + 1)}>Try again</button>
          </div>
        </div>
      )}
      <div ref={holder} className="pdf-preview-pages" />
    </div>
  )
}

// Pixels that aren't (near-)white, sampled on a grid to stay fast.
function countInk(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  const data = ctx.getImageData(0, 0, w, h).data
  let ink = 0
  for (let i = 0; i < data.length; i += 4 * 7) {
    if (data[i] < 200 || data[i + 1] < 200 || data[i + 2] < 200) ink++
  }
  return ink
}
