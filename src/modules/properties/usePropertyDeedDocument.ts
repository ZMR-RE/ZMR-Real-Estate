import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  getDocumentSignedUrl,
  getLatestPropertyDocumentByCategory,
  uploadPropertyDocument,
  type DocumentRecord,
} from '../documents/documentsQueries'

const DEED_CATEGORY = 'Deed'

// Roadmap 7.39 (3) — Deed document, self-contained (same pattern as
// usePropertyPhoto/InsuranceLedger: a section fetching its own data off
// just a propertyId, droppable into View mode read-only and Edit mode
// with the upload control). Unlike the photo, this doesn't need a
// persistent signed URL for an <img> — "view" opens a fresh 60s-expiry
// link on click, same as every other document-viewing button in the
// app (InsuranceLedger, Property Tax installments, etc.).
export function usePropertyDeedDocument(propertyId: string) {
  const { accountId, session } = useAuth()
  const [document, setDocument] = useState<DocumentRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await getLatestPropertyDocumentByCategory(accountId, propertyId, DEED_CATEGORY)
    setLoading(false)
    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setDocument(data)
  }, [accountId, propertyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const upload = async (file: File) => {
    if (!accountId || !session) return
    setUploading(true)
    const { error: uploadError } = await uploadPropertyDocument({
      accountId,
      propertyId,
      category: DEED_CATEGORY,
      label: null,
      uploadedBy: session.user.id,
      file,
    })
    setUploading(false)
    if (uploadError) {
      setError(uploadError.message)
      return
    }
    setError(null)
    await refresh()
  }

  const view = async () => {
    if (!document?.storage_path) return
    const { data, error: urlError } = await getDocumentSignedUrl(document.storage_path)
    if (urlError || !data) {
      setError(urlError?.message ?? 'Could not load document')
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  return { document, loading, uploading, error, upload, view }
}
