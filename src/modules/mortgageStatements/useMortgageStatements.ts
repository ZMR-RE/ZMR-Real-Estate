import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { StatementDocument, StatementScope, StatementStore, UploadRow } from './statementTypes'
import { assertScope, prepareStatementFiles } from './statementLogic'
import { createStatementUploader } from './statementUpload'
// Mount this hook with a key containing account/property/loan. Never reuse an
// in-flight queue across a scope change.
export function useMortgageStatements(scope: StatementScope, store: StatementStore) {
  const [documents, setDocuments] = useState<StatementDocument[]>([])
  const [rows, setRows] = useState<UploadRow[]>([])
  const queue = useRef<UploadRow[]>([])
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const uploader = useMemo(() => createStatementUploader(store, scope), [store, scope])
  const refresh = useCallback(async () => {
    const result = await store.list(scope)
    result.forEach(doc => assertScope(doc, scope))
    setDocuments(result)
  }, [scope, store])
  useEffect(() => {
    let active = true
    store.list(scope).then(result => {
      result.forEach(doc => assertScope(doc, scope))
      if (active) setDocuments(result)
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Unable to load statements.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [store, scope])
  function updateRows(next: UploadRow[]) { queue.current = next; setRows(next) }
  async function addFiles(files: File[]) {
    if (lock.current) throw new Error('Wait for the current files to finish.')
    lock.current = true; setBusy(true)
    try {
      const added = await prepareStatementFiles(files, queue.current)
      if (!added.length) throw new Error('These files are already in this upload batch.')
      updateRows([...queue.current, ...added.map(row=>{const existing=documents.find(d=>d.digest===row.input.digest);return existing?{...row,status:'saved' as const,document:existing,existing:true}:row})])
    } finally { lock.current = false; setBusy(false) }
  }
  function change(id: string, input: Partial<UploadRow['input']>) {
    updateRows(queue.current.map(row => row.input.requestId === id && row.status === 'ready'
      ? { ...row, input: { ...row.input, ...input } } : row))
  }
  async function save() {
    if (lock.current) return
    lock.current = true; setBusy(true); setError(null)
    try {
      await uploader(queue.current, (id, changes) => updateRows(queue.current.map(row => row.input.requestId === id ? { ...row, ...changes } : row)))
      await refresh()
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to refresh statements. Saved files remain saved.') }
    finally { lock.current = false; setBusy(false) }
  }
  function clear() { if (!lock.current) updateRows([]) }
  return { documents, rows, busy, error, loading, addFiles, change, save, clear, refresh }
}
