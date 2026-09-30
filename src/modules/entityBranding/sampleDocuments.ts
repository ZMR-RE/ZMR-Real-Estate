import type { InvoiceDoc, ReceiptDoc } from './stationeryTypes'

// FICTIONAL sample content for the Branding & documents live preview — shows
// how THIS entity's saved stationery looks. Not a real tenant, tenancy or
// charge; never stored.
export function sampleInvoice(paymentInstructions: string | null, note: string | null): InvoiceDoc {
  return {
    number: 'SAMPLE-INV-000001',
    issueDate: '2026-09-25',
    dueDate: '2026-10-01',
    periodLabel: 'October 2026',
    billTo: [
      { name: 'Sample Tenant One', email: 'tenant.one@example.com', phone: '(555) 010-1111' },
      { name: 'Sample Tenant Two', email: null, phone: null },
    ],
    rental: { address: 'Sample property', unit: 'Unit 1' },
    lines: [
      { description: 'Rent — October 2026', amount: 1450 },
      { description: 'Credit — sample adjustment', amount: -50 },
    ],
    paymentInstructions,
    note,
    priorUnpaid: [],
  }
}

export function sampleReceipt(note: string | null): ReceiptDoc {
  return {
    number: 'SAMPLE-RCT-000001',
    paymentDate: '2026-10-03',
    receivedFrom: [{ name: 'Sample Tenant One', email: 'tenant.one@example.com', phone: null }],
    method: 'Zelle',
    reference: 'SAMPLE-REF',
    amount: 1400,
    applied: [{ invoiceNumber: 'SAMPLE-INV-000001', periodLabel: 'October 2026', amount: 1400, remaining: 0 }],
    rental: { address: 'Sample property', unit: 'Unit 1' },
    note,
  }
}
