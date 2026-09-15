import { useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { propertyLabel } from '../../shared/propertyLabel'
import { listProperties } from '../properties/propertiesQueries'
import { createMileageEntry } from './mileageQueries'

function todayDateString() {
  return new Date().toISOString().slice(0, 10)
}

// Quick-entry mileage log embedded in Log It / Quick Capture (roadmap
// 9.10) — a separate form from CaptureForm's receipt/visit/communication
// flow (1.3's fixed set of 3 stays as-is), sharing only the property
// picker pattern.
export function useMileageEntryForm() {
  const { accountId, session } = useAuth()
  const [propertyOptions, setPropertyOptions] = useState<{ id: string; label: string }[]>([])
  const [propertiesLoading, setPropertiesLoading] = useState(true)
  const [propertyId, setPropertyId] = useState<string | null>(null)
  const [logDate, setLogDate] = useState(todayDateString())
  const [miles, setMiles] = useState('')
  const [purpose, setPurpose] = useState('')
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

  const reset = () => {
    setPropertyId(null)
    setLogDate(todayDateString())
    setMiles('')
    setPurpose('')
  }

  const submit = async () => {
    if (!accountId || !session) return

    if (!propertyId) {
      setError('Property is required.')
      return
    }

    const parsedMiles = Number(miles)
    if (!miles || Number.isNaN(parsedMiles) || parsedMiles <= 0) {
      setError('Enter a positive number of miles.')
      return
    }

    setSubmitting(true)
    const { error: saveError } = await createMileageEntry({
      accountId,
      propertyId,
      loggedBy: session.user.id,
      logDate,
      miles: parsedMiles,
      purpose: purpose.trim() || null,
    })
    setSubmitting(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    setError(null)
    reset()
    setSavedAt(Date.now())
  }

  return {
    propertyOptions,
    propertiesLoading,
    propertyId,
    setPropertyId,
    logDate,
    setLogDate,
    miles,
    setMiles,
    purpose,
    setPurpose,
    submitting,
    error,
    savedAt,
    submit,
  }
}
