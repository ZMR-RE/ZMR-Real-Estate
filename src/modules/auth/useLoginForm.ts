import { useState, type FormEvent } from 'react'
import { requestPasswordReset } from '../account/accountQueries'
import { signInWithPassword } from './authQueries'

export function useLoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [resetState, setResetState] = useState<'idle' | 'sending' | 'sent'>('idle')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error: signInError } = await signInWithPassword(email, password)

    setSubmitting(false)
    if (signInError) {
      setError(signInError.message)
    }
  }

  const startResettingPassword = () => {
    setError(null)
    setResetState('idle')
    setIsResettingPassword(true)
  }

  const cancelResettingPassword = () => {
    setIsResettingPassword(false)
  }

  const submitPasswordReset = async (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim()) {
      setError('Enter your email above first.')
      return
    }
    setError(null)
    setResetState('sending')
    const { error: resetError } = await requestPasswordReset(email.trim())
    if (resetError) {
      setError(resetError.message)
      setResetState('idle')
      return
    }
    setResetState('sent')
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    error,
    submitting,
    handleSubmit,
    isResettingPassword,
    startResettingPassword,
    cancelResettingPassword,
    resetState,
    submitPasswordReset,
  }
}
