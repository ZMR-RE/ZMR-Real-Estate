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
  // Stage 1: numbered, lifecycle-tracked invoices. Legacy invoices are
  // 'issued' with no number.
  number: string | null
  state: 'issued' | 'superseded' | 'cancelled'
  lease_id: string | null
  property: { id: string; name: string; address: string | null } | null
  payments: Payment[]
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
      'id, property_id, billed_to, period_start, period_end, amount_due, due_date, notes, number, state, lease_id, property:properties(id, name, address), payments(id, amount, paid_date, method, notes)',
    )
    .eq('account_id', accountId)
    // Drafts and approvals live in "Invoices to review" — only issued
    // (and superseded/cancelled, kept for the record) invoices carry a
    // payment status here.
    .in('state', ['issued', 'superseded', 'cancelled'])
    .order('due_date', { ascending: false })
    .returns<Invoice[]>()
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
