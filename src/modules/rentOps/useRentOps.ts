import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { listInvoices, recordPayment, type Invoice, type PaymentInput } from './rentOpsQueries'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentTargetId, setPaymentTargetId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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

  // Invoices are created through the review-and-issue workflow
  // (rentInvoices/useInvoiceWorkflow); this hook keeps the issued list and
  // payments.
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
    loading,
    error,
    paymentTargetId,
    saving,
    refresh,
    startRecordingPayment,
    cancelRecordingPayment,
    savePayment,
  }
}
