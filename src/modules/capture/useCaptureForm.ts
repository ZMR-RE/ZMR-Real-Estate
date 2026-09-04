import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { listProperties } from '../properties/propertiesQueries'
import { createCaptureEntry, uploadAttachment, type AttachmentType, type EntryType } from './captureQueries'

function todayDateString() {
  return new Date().toISOString().slice(0, 10)
}

function attachmentTypeFor(file: File): AttachmentType | null {
  if (file.type.startsWith('image/')) return 'photo'
  if (file.type === 'application/pdf') return 'pdf'
  return null
}

export function useCaptureForm() {
  const { accountId, session } = useAuth()
  const [propertyOptions, setPropertyOptions] = useState<{ id: string; label: string }[]>([])
  const [propertiesLoading, setPropertiesLoading] = useState(true)
  const [entryType, setEntryType] = useState<EntryType | null>(null)
  const [propertyId, setPropertyId] = useState<string | null>(null)
  const [entryDate, setEntryDate] = useState(todayDateString())
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    if (!accountId) return
    setPropertiesLoading(true)
    listProperties(accountId).then(({ data }) => {
      setPropertyOptions((data ?? []).map((p) => ({ id: p.id, label: p.name })))
      setPropertiesLoading(false)
    })
  }, [accountId])

  const reset = () => {
    setEntryType(null)
    setPropertyId(null)
    setEntryDate(todayDateString())
    setNotes('')
    setFile(null)
  }

  const submit = async () => {
    if (!accountId || !session) return

    if (!entryType || !propertyId || !file) {
      setError('Type, property, and an attachment are all required.')
      return
    }

    const attachmentType = attachmentTypeFor(file)
    if (!attachmentType) {
      setError('Attachment must be a photo or a PDF.')
      return
    }

    setSubmitting(true)
    setError(null)

    const { path, error: uploadError } = await uploadAttachment(accountId, file)
    if (uploadError) {
      setSubmitting(false)
      setError(uploadError.message)
      return
    }

    const { error: insertError } = await createCaptureEntry({
      accountId,
      propertyId,
      capturedBy: session.user.id,
      entryType,
      entryDate,
      notes: notes.trim() || null,
      attachmentPath: path,
      attachmentType,
    })

    setSubmitting(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    reset()
    setSavedAt(Date.now())
  }

  return {
    propertyOptions,
    propertiesLoading,
    entryType,
    setEntryType,
    propertyId,
    setPropertyId,
    entryDate,
    setEntryDate,
    notes,
    setNotes,
    file,
    setFile,
    submitting,
    error,
    savedAt,
    submit,
  }
}
