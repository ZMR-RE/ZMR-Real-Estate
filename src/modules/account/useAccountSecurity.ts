import { useCallback, useEffect, useState } from 'react'
import type { Factor } from '@supabase/supabase-js'
import { useAuth } from '../../shared/auth/AuthContext'
import {
  enrollTotpFactor,
  listTotpFactors,
  requestPasswordReset,
  unenrollFactor,
  verifyTotpCode,
} from './accountQueries'

interface EnrollData {
  factorId: string
  qrCode: string
  secret: string
}

export function useAccountSecurity() {
  const { session } = useAuth()
  const [factors, setFactors] = useState<Factor[]>([])
  const [loadingFactors, setLoadingFactors] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [resetState, setResetState] = useState<'idle' | 'sending' | 'sent'>('idle')

  const [enrollData, setEnrollData] = useState<EnrollData | null>(null)
  const [enrolling, setEnrolling] = useState(false)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [removingFactorId, setRemovingFactorId] = useState<string | null>(null)

  const refreshFactors = useCallback(async () => {
    setLoadingFactors(true)
    const { data, error: fetchError } = await listTotpFactors()
    setLoadingFactors(false)
    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setFactors(data ?? [])
  }, [])

  useEffect(() => {
    refreshFactors()
  }, [refreshFactors])

  const sendResetEmail = async () => {
    if (!session?.user.email) return
    setResetState('sending')
    const { error: resetError } = await requestPasswordReset(session.user.email)
    if (resetError) {
      setError(resetError.message)
      setResetState('idle')
      return
    }
    setError(null)
    setResetState('sent')
  }

  const startEnroll = async () => {
    setEnrolling(true)

    // Clear out any unverified factor left behind by a previous abandoned
    // attempt (closed panel, page reload mid-enroll, etc.) — Supabase
    // rejects a new enroll() if its friendly name collides with one still
    // sitting unverified, so a stuck enrollment would otherwise block
    // every retry.
    const { data: existing } = await listTotpFactors()
    for (const factor of existing ?? []) {
      if (factor.status === 'unverified') {
        await unenrollFactor(factor.id)
      }
    }

    const { data, error: enrollError } = await enrollTotpFactor()
    setEnrolling(false)
    if (enrollError || !data) {
      setError(enrollError?.message ?? 'Could not start 2FA enrollment.')
      return
    }
    setError(null)
    setVerifyCode('')
    setEnrollData({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret })
  }

  const cancelEnroll = async () => {
    if (enrollData) {
      await unenrollFactor(enrollData.factorId)
    }
    setEnrollData(null)
    setVerifyCode('')
  }

  const submitVerifyCode = async () => {
    if (!enrollData) return
    setVerifying(true)
    const { error: verifyError } = await verifyTotpCode(enrollData.factorId, verifyCode)
    setVerifying(false)
    if (verifyError) {
      setError(verifyError.message)
      return
    }
    setError(null)
    setEnrollData(null)
    setVerifyCode('')
    await refreshFactors()
  }

  const removeFactor = async (factorId: string) => {
    setRemovingFactorId(factorId)
    const { error: removeError } = await unenrollFactor(factorId)
    setRemovingFactorId(null)
    if (removeError) {
      setError(removeError.message)
      return
    }
    setError(null)
    await refreshFactors()
  }

  return {
    factors,
    loadingFactors,
    error,
    resetState,
    sendResetEmail,
    enrollData,
    enrolling,
    startEnroll,
    cancelEnroll,
    verifyCode,
    setVerifyCode,
    verifying,
    submitVerifyCode,
    removingFactorId,
    removeFactor,
  }
}
