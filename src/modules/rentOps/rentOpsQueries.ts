import { supabase } from '../../shared/supabaseClient'

export interface Payment {
  id: string
  amount: string
  paid_date: string
  method: string | null
  notes: string | null
}

export interface Invoice {
  id: string
  property_id: string
  billed_to: string | null
  period_start: string
  period_end: string
  amount_due: string
  due_date: string
  notes: string | null
  property: { id: string; name: string } | null
  payments: Payment[]
}

export interface InvoiceInput {
  propertyId: string
  billedTo: string | null
  periodStart: string
  periodEnd: string
  amountDue: string
  dueDate: string
  notes: string | null
}

export interface PaymentInput {
  invoiceId: string
  amount: string
  paidDate: string
  method: string | null
  notes: string | null
}

export async function listInvoices(accountId: string) {
  return supabase
    .from('invoices')
    .select(
      'id, property_id, billed_to, period_start, period_end, amount_due, due_date, notes, property:properties(id, name), payments(id, amount, paid_date, method, notes)',
    )
    .eq('account_id', accountId)
    .order('due_date', { ascending: false })
    .returns<Invoice[]>()
}

export async function createInvoice(accountId: string, input: InvoiceInput) {
  return supabase
    .from('invoices')
    .insert({
      account_id: accountId,
      property_id: input.propertyId,
      billed_to: input.billedTo,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      amount_due: input.amountDue,
      due_date: input.dueDate,
      notes: input.notes,
    })
    .select()
    .single()
}

export async function recordPayment(accountId: string, input: PaymentInput) {
  return supabase
    .from('payments')
    .insert({
      account_id: accountId,
      invoice_id: input.invoiceId,
      amount: input.amount,
      paid_date: input.paidDate,
      method: input.method,
      notes: input.notes,
    })
    .select()
    .single()
}
