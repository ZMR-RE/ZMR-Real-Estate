import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { propertyLabel } from '../../shared/propertyLabel'
import { hasAtMostTwoDecimalPlaces } from '../../shared/currencyInput'
import { listProperties } from '../properties/propertiesQueries'
import { listUnits } from '../units/unitsQueries'
import { useVendors } from '../vendors/useVendors'
import {
  addCaptureAttachments,
  createCaptureEntry,
  uploadAttachment,
  MAX_ATTACHMENTS_PER_ENTRY,
  type AttachmentType,
  type EntryType,
} from './captureQueries'

function todayDateString() {
  return new Date().toISOString().slice(0, 10)
}

function attachmentTypeFor(file: File): AttachmentType | null {
  if (file.type.startsWith('image/')) return 'photo'
  if (file.type === 'application/pdf') return 'pdf'
  return null
}

// Roadmap 1.6 — capture-type selection is mandatory before any other
// field appears; CaptureForm.tsx enforces the "before" part (it doesn't
// render property/date/etc. until entryType is set), this hook just
// never defaults entryType away from null.
export function useCaptureForm(onCaptured?: () => void) {
  const { accountId, session } = useAuth()
  const { vendorOptions, addVendor } = useVendors(accountId)
  const [propertyOptions, setPropertyOptions] = useState<{ id: string; label: string }[]>([])
  const [propertiesLoading, setPropertiesLoading] = useState(true)
  const [entryType, setEntryType] = useState<EntryType | null>(null)
  const [propertyId, setPropertyIdState] = useState<string | null>(null)
  const [unitOptions, setUnitOptions] = useState<{ id: string; label: string }[]>([])
  const [unitId, setUnitId] = useState<string | null>(null)
  const [entryDate, setEntryDate] = useState(todayDateString())
  const [notes, setNotes] = useState('')
  const [milesDriven, setMilesDriven] = useState('')
  const [vendorId, setVendorId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [repairOrImprovement, setRepairOrImprovement] = useState('')
  const [metWith, setMetWith] = useState('')
  const [visitType, setVisitType] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactMethod, setContactMethod] = useState('')
  const [subject, setSubject] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    if (!accountId) return
    setPropertiesLoading(true)
    listProperties(accountId).then(({ data }) => {
      setPropertyOptions((data ?? []).map((p) => ({ id: p.id, label: propertyLabel(p) })))
      setPropertiesLoading(false)
    })
  }, [accountId])

  // Roadmap 1.16 — Unit only makes sense scoped to whichever property is
  // currently selected, so it's re-fetched every time propertyId changes
  // rather than loaded once up front like propertyOptions.
  useEffect(() => {
    if (!accountId || !propertyId) {
      setUnitOptions([])
      return
    }
    listUnits(accountId, propertyId).then(({ data }) => {
      setUnitOptions((data ?? []).map((u) => ({ id: u.id, label: u.unit_label })))
    })
  }, [accountId, propertyId])

  // A unit selected under the previous property is never valid once the
  // property itself changes — every propertyId change starts Unit over.
  const setPropertyId = (id: string | null) => {
    setPropertyIdState(id)
    setUnitId(null)
  }

  const reset = () => {
    setEntryType(null)
    setPropertyId(null)
    setEntryDate(todayDateString())
    setNotes('')
    setMilesDriven('')
    setVendorId(null)
    setAmount('')
    setCategory('')
    setPaymentMethod('')
    setRepairOrImprovement('')
    setMetWith('')
    setVisitType('')
    setContactName('')
    setContactMethod('')
    setSubject('')
    setFiles([])
  }

  // Roadmap 1.8 — up to 25 attachments; adds to whatever's already
  // staged rather than replacing it, since <input type="file" multiple>
  // firing again (e.g. a second photo) would otherwise clobber the
  // first batch.
  const addFiles = (newFiles: File[]) => {
    setFiles((prev) => {
      const room = MAX_ATTACHMENTS_PER_ENTRY - prev.length
      if (room <= 0) {
        setError(`Up to ${MAX_ATTACHMENTS_PER_ENTRY} attachments per entry.`)
        return prev
      }
      return [...prev, ...newFiles.slice(0, room)]
    })
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const submit = async () => {
    if (!accountId || !session) return

    // Roadmap 1.7 — only type, property, and date are required to save.
    if (!entryType || !propertyId) {
      setError('Type and property are required.')
      return
    }

    const invalidFile = files.find((f) => !attachmentTypeFor(f))
    if (invalidFile) {
      setError('Attachments must be photos or PDFs.')
      return
    }

    const parsedMiles = milesDriven.trim() ? Number(milesDriven) : null
    if (milesDriven.trim() && (Number.isNaN(parsedMiles) || (parsedMiles as number) < 0)) {
      setError('Miles driven must be a positive number.')
      return
    }

    const parsedAmount = amount.trim() ? Number(amount) : null
    if (amount.trim() && (Number.isNaN(parsedAmount) || (parsedAmount as number) <= 0)) {
      setError('Amount must be a positive number.')
      return
    }
    if (amount.trim() && !hasAtMostTwoDecimalPlaces(amount)) {
      setError('Amount can have at most 2 decimal places.')
      return
    }

    setSubmitting(true)
    setError(null)

    const { data: entry, error: insertError } = await createCaptureEntry({
      accountId,
      propertyId,
      capturedBy: session.user.id,
      entryType,
      entryDate,
      notes: notes.trim() || null,
      milesDriven: parsedMiles,
      unitId,
      vendorId,
      amount: parsedAmount,
      category: category || null,
      paymentMethod: paymentMethod || null,
      repairOrImprovement: repairOrImprovement || null,
      metWith: metWith.trim() || null,
      visitType: visitType || null,
      contactName: contactName.trim() || null,
      contactMethod: contactMethod || null,
      subject: subject.trim() || null,
    })

    if (insertError || !entry) {
      setSubmitting(false)
      setError(insertError?.message ?? 'Could not save entry.')
      return
    }

    if (files.length > 0) {
      const uploaded: { path: string; type: AttachmentType }[] = []
      for (const file of files) {
        const { path, error: uploadError } = await uploadAttachment(accountId, file)
        if (uploadError) {
          setSubmitting(false)
          setError(uploadError.message)
          return
        }
        uploaded.push({ path, type: attachmentTypeFor(file)! })
      }

      const { error: attachError } = await addCaptureAttachments(accountId, entry.id, uploaded)
      if (attachError) {
        setSubmitting(false)
        setError(attachError.message)
        return
      }
    }

    setSubmitting(false)
    reset()
    setSavedAt(Date.now())
    onCaptured?.()
  }

  return {
    propertyOptions,
    propertiesLoading,
    entryType,
    setEntryType,
    propertyId,
    setPropertyId,
    unitId,
    setUnitId,
    unitOptions,
    entryDate,
    setEntryDate,
    notes,
    setNotes,
    milesDriven,
    setMilesDriven,
    vendorId,
    setVendorId,
    vendorOptions,
    onCreateVendor: addVendor,
    amount,
    setAmount,
    category,
    setCategory,
    paymentMethod,
    setPaymentMethod,
    repairOrImprovement,
    setRepairOrImprovement,
    metWith,
    setMetWith,
    visitType,
    setVisitType,
    contactName,
    setContactName,
    contactMethod,
    setContactMethod,
    subject,
    setSubject,
    files,
    addFiles,
    removeFile,
    submitting,
    error,
    savedAt,
    submit,
  }
}
