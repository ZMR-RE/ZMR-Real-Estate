import { useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  createPropertyLink,
  uploadPropertyDocument,
  type DocumentCategory,
  type DocumentRecord,
} from './documentsQueries'

export interface AddDocumentLinkInput {
  category: DocumentCategory
  label: string | null
  file: File | null
  linkUrl: string | null
}

// Roadmap 7.17 — Property Overview's freeform Documents/links section.
// Reads off the same `documents` list PropertyProfile already fetches
// (per CLAUDE.md's Single source of truth rule — no second query, no
// second copy of this data), and only adds the create half here.
export function useDocumentLinks(propertyId: string, onAdded: () => Promise<void>) {
  const { accountId, session } = useAuth()
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startAdding = () => {
    setError(null)
    setIsAdding(true)
  }

  const cancelAdding = () => {
    setIsAdding(false)
    setError(null)
  }

  const add = async (input: AddDocumentLinkInput) => {
    if (!accountId || !session) return

    if (!input.file && !input.linkUrl) {
      setError('Choose a file or enter a link.')
      return
    }

    setSaving(true)
    const { error: saveError } = input.file
      ? await uploadPropertyDocument({
          accountId,
          propertyId,
          category: input.category,
          label: input.label,
          uploadedBy: session.user.id,
          file: input.file,
        })
      : await createPropertyLink({
          accountId,
          propertyId,
          category: input.category,
          label: input.label,
          uploadedBy: session.user.id,
          linkUrl: input.linkUrl!,
        })
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    setIsAdding(false)
    await onAdded()
  }

  return { isAdding, saving, error, startAdding, cancelAdding, add }
}

// Roadmap 7.17 — this section's own list is everything not already
// surfaced elsewhere on Overview: Insurance already gets its own list
// (PropertySummary), and Receipts are Financials' concern (tied to a
// transaction) — excluding both here avoids a right-under-each-other
// duplicate of the same document.
export function filterOverviewDocumentLinks(documents: DocumentRecord[]): DocumentRecord[] {
  return documents.filter((doc) => doc.transaction_id === null && doc.category !== 'Insurance')
}
