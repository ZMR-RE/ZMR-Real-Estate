import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { listProperties } from '../properties/propertiesQueries'
import {
  createInvoice,
  listInvoices,
  recordPayment,
  type Invoice,
  type InvoiceInput,
  type PaymentInput,
} from './rentOpsQueries'

export type InvoiceStatus = 'pending' | 'overdue' | 'partial' | 'paid-on-time' | 'paid-late'

export function invoiceStatus(invoice: Invoice, today = new Date()): InvoiceStatus {
  const amountDue = Number(invoice.amount_due)
  const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const dueDate = invoice.due_date

  if (totalPaid >= amountDue && amountDue > 0) {
    const lastPaidDate = invoice.payments
      .map((p) => p.paid_date)
      .sort()
      .at(-1)!
    return lastPaidDate <= dueDate ? 'paid-on-time' : 'paid-late'
  }

  if (totalPaid > 0) {
    return 'partial'
  }

  const todayStr = today.toISOString().slice(0, 10)
  return todayStr > dueDate ? 'overdue' : 'pending'
}

export function useRentOps() {
  const { accountId } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [propertyOptions, setPropertyOptions] = useState<{ id: string; label: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false)
  const [paymentTargetId, setPaymentTargetId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!accountId) return
    listProperties(accountId).then(({ data }) => {
      setPropertyOptions((data ?? []).map((p) => ({ id: p.id, label: p.name })))
    })
  }, [accountId])

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listInvoices(accountId)
    setLoading(false)
    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setInvoices(data ?? [])
  }, [accountId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const startCreatingInvoice = () => setIsCreatingInvoice(true)
  const cancelCreatingInvoice = () => setIsCreatingInvoice(false)

  const saveInvoice = async (input: InvoiceInput) => {
    if (!accountId) return
    setSaving(true)
    const { error: saveError } = await createInvoice(accountId, input)
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    setIsCreatingInvoice(false)
    await refresh()
  }

  const startRecordingPayment = (invoiceId: string) => setPaymentTargetId(invoiceId)
  const cancelRecordingPayment = () => setPaymentTargetId(null)

  const savePayment = async (input: PaymentInput) => {
    if (!accountId) return
    setSaving(true)
    const { error: saveError } = await recordPayment(accountId, input)
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    setPaymentTargetId(null)
    await refresh()
  }

  return {
    invoices,
    propertyOptions,
    loading,
    error,
    isCreatingInvoice,
    paymentTargetId,
    saving,
    startCreatingInvoice,
    cancelCreatingInvoice,
    saveInvoice,
    startRecordingPayment,
    cancelRecordingPayment,
    savePayment,
  }
}
