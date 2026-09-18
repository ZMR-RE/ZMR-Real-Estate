import { useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  createPropertyLink,
  uploadPropertyDocument,
  type DocumentCategory,
} from './documentsQueries'

export interface AddDocumentLinkInput {
  category: DocumentCategory
  label: string | null
  file: File | null
  linkUrl: string | null
  linkType: 'drive_folder' | null
}

// Roadmap 7.17 — Activity & Documents' freeform upload-or-link entry
// (moved here from a separate Property Overview section per the Single
// source of truth rule: one place to view documents, one place to add
// them). Reads off the same `documents` list PropertyProfile already
// fetches — no second query, no second copy of this data.
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
          linkType: input.linkType,
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
