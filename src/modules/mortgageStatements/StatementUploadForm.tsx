import { useState, type FormEvent } from 'react'
import type { UploadRow } from './statementTypes'
import { suggestedStatementName, validStatementDate } from './statementLogic'
export function StatementUploadForm({ rows, busy, lender, suffix, onFiles, onChange, onSave, onCancel, onOpen }: {
  rows: UploadRow[]; busy: boolean; lender: string; suffix: string
  onFiles: (files: File[]) => Promise<void>
  onChange: (id: string, input: Partial<UploadRow['input']>) => void
  onOpen?: (id:string)=>void
  onSave: () => Promise<void>; onCancel: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(null)
    if (!rows.length) { setError('Choose at least one PDF.'); return }
    if (rows.some(r => !r.input.displayName.trim() || (r.input.statementDate && !validStatementDate(r.input.statementDate)))) {
      setError('Check the display names and printed statement dates.'); return
    }
    await onSave()
  }
  return <form className="statement-upload-form" onSubmit={submit}>
    <p>Upload originals once. They will also appear in this property’s Documents. Uploading does not record a payment or reconcile a balance.</p>
    {error && <p role="alert">{error}</p>}
    <label htmlFor="statement-files">Choose statements (PDF, up to 25 MB each)</label>
    <input id="statement-files" type="file" accept="application/pdf,.pdf" multiple disabled={busy} onChange={async e => {
      const files = [...(e.target.files ?? [])]; e.target.value = ''; setError(null)
      try { await onFiles(files) } catch (err) { setError(err instanceof Error ? err.message : 'Unable to read files.') }
    }}/>
    {rows.map(row => <fieldset key={row.input.requestId} disabled={busy || row.status !== 'ready'}>
      <legend>{row.input.originalFilename}</legend>
      <label htmlFor={`date-${row.input.requestId}`}>Statement date</label>
      <input id={`date-${row.input.requestId}`} type="date" value={row.input.statementDate ?? ''} onInput={e => onChange(row.input.requestId, { statementDate: e.currentTarget.value || null })} onChange={e => onChange(row.input.requestId, { statementDate: e.target.value || null })}/>
      <label htmlFor={`name-${row.input.requestId}`}>Label<span className="required-marker">*</span></label>
      <input id={`name-${row.input.requestId}`} value={row.input.displayName} onChange={e => onChange(row.input.requestId, { displayName: e.target.value })}/>
      <button type="button" disabled={!row.input.statementDate || !validStatementDate(row.input.statementDate)} onClick={() => onChange(row.input.requestId, { displayName: suggestedStatementName(lender, suffix, row.input.statementDate!) })}>Use suggested name</button>
      <p role="status">{row.status === 'saved' ? (row.existing?'Identical file already saved — skipped':'Uploaded · needs review') : row.status === 'failed' ? 'Not confirmed — retry safely' : row.status === 'uploading' ? 'Uploading…' : 'Ready to upload'}</p>
      {row.error && <p role="alert">{row.error}</p>}
    </fieldset>)}
    {rows.filter(r=>r.existing&&r.document).map(r=><button key={r.input.requestId} type="button" onClick={()=>onOpen?.(r.document!.id)}>Open existing: {r.document!.displayName}</button>)}
    <div className="statement-actions"><button type="submit" disabled={busy || (rows.length > 0 && rows.every(r => r.status === 'saved'))}>{busy ? 'Uploading…' : rows.some(r => r.status === 'failed') ? 'Retry unfinished uploads' : 'Save'}</button>
      <button type="button" disabled={busy} onClick={onCancel}>{rows.length > 0 && rows.every(r => r.status === 'saved') ? 'Done' : 'Cancel'}</button></div>
  </form>
}
