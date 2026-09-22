import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { getDocumentSignedUrl, getLatestPropertyPhoto, uploadPropertyDocument } from '../documents/documentsQueries'

// Roadmap 7.32 (6) — property photo, self-contained (mirrors
// InsuranceLedger/PropertyValueHistorySection's pattern of a section
// fetching its own data off just a propertyId) so it can be dropped into
// both View mode (PropertyIdentityHeader, read-only) and Edit mode
// (PropertyForm, with the upload control) without either owning the
// fetch. One hour signed-URL expiry — long enough for someone to sit on
// the Overview tab without the <img> silently breaking mid-session; a
// full page reload re-fetches it anyway.
const PHOTO_URL_EXPIRY_SECONDS = 3600

export function usePropertyPhoto(propertyId: string) {
  const { accountId, session } = useAuth()
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data: photo, error: fetchError } = await getLatestPropertyPhoto(accountId, propertyId)
    if (fetchError || !photo) {
      setLoading(false)
      setPhotoUrl(null)
      if (fetchError) setError(fetchError.message)
      return
    }
    const { data: signed, error: urlError } = await getDocumentSignedUrl(photo.storage_path!, PHOTO_URL_EXPIRY_SECONDS)
    setLoading(false)
    if (urlError || !signed) {
      setPhotoUrl(null)
      setError(urlError?.message ?? 'Could not load photo')
      return
    }
    setError(null)
    setPhotoUrl(signed.signedUrl)
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
      category: 'Photos',
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

  return { photoUrl, loading, uploading, error, upload }
}
