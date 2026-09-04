import { useState, type FormEvent } from 'react'
import { signInWithPassword } from './authQueries'

export function useLoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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

  return {
    email,
    setEmail,
    password,
    setPassword,
    error,
    submitting,
    handleSubmit,
  }
}
