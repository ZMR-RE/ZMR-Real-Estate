import { useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { createPropertyLink, uploadPropertyDocument, type DocumentRecord } from './documentsQueries'
import { updateDocumentMetadata } from './documentMetadataQueries'
import { safeLink } from './libraryLogic'
import type { AddDocumentLinkInput } from './useDocumentLinks'

export function useDocumentLibrary(propertyId: string, documents: DocumentRecord[], refresh: () => Promise<void>) {
  const { accountId, session } = useAuth()
  const [saved, setSaved] = useState<Record<string, DocumentRecord>>({})
  const [notice, setNotice] = useState<string | null>(null)
  async function completed(row: DocumentRecord) {
    setSaved(previous => ({ ...previous, [row.id]: row }))
    setNotice(null)
    // A completed write must not become a failed Save just because refresh failed.
    try {
      await refresh()
      setSaved(previous => { const next = { ...previous }; delete next[row.id]; return next })
    } catch { setNotice('Saved. The list could not refresh; reopen this tab to refresh it.') }
  }
  async function add(input: AddDocumentLinkInput) {
    if (!accountId || !session) throw Error('Please sign in again before saving.')
    if (!input.category.trim()) throw Error('Choose a category.')
    if (!input.file && !input.linkUrl) throw Error('Choose a file or enter a web address.')
    const link = input.linkUrl ? safeLink(input.linkUrl) : null
    if (!input.file && !link) throw Error('Enter an http or https web address without a password.')
    const common = { accountId, propertyId, category: input.category, label: input.label, uploadedBy: session.user.id }
    const result = input.file
      ? await uploadPropertyDocument({ ...common, file: input.file })
      : await createPropertyLink({ ...common, linkUrl: link!, linkType: input.linkType })
    if (result.error) throw Error(result.error.message)
    if (!('data' in result) || !result.data) throw Error('The save could not be confirmed. Refresh the list before trying again.')
    await completed(result.data)
  }
  async function edit(doc: DocumentRecord, label: string, url: string) {
    if (!accountId || !session) throw Error('Please sign in again before saving.')
    await completed(await updateDocumentMetadata(accountId, propertyId, doc, label, url))
  }
  const rows = documents.map(d => saved[d.id] ?? d)
  for (const row of Object.values(saved)) if (!documents.some(d => d.id === row.id)) rows.push(row)
  return { rows, notice, add, edit }
}
