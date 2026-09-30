import { SAMPLE_LOGO } from './sampleLogo'
import type { EntityProfileFields, SampleInvoice, SampleReceipt, Stationery } from './stationeryTypes'

// FICTIONAL preview data. The entity fields are the ones the EXISTING entity
// profile already holds (Identity + Invoicing boxes); the stationery values
// are the proposed Branding & documents settings.

export const SAMPLE_ENTITY: EntityProfileFields = {
  legalName: 'Example Holdings LLC',
  displayName: 'Example Holdings',
  mailingAddress: '100 Main Street',
  mailingCity: 'Springfield',
  mailingState: 'IL',
  mailingZip: '62701',
  invoiceCode: 'A',
  replyTo: 'billing@example.com',
  paymentInstructions: 'Zelle to billing@example.com, or a check payable to Example Holdings LLC mailed to the address above.',
}

export const SAMPLE_STATIONERY: Stationery = {
  logo: SAMPLE_LOGO,
  colors: { heading: '#1F4E79', accent: '#C99730', highlight: '#1F4E79', secondary: '#5B6472' },
  contact: { phone: '(555) 010-2030', website: 'example.com' },
  defaults: {
    paperSize: 'letter',
    showLegalName: true,
    invoiceNote: 'Please include the invoice number with your payment.',
    documentFooter: 'Thank you for being a tenant with Example Holdings.',
    receiptNote: 'Thank you — your payment has been recorded.',
  },
}

export const SAMPLE_INVOICE: SampleInvoice = {
  number: 'A-INV-000001',
  issueDate: '2026-09-25',
  dueDate: '2026-10-01',
  periodLabel: 'October 2026',
  billTo: { name: 'Riley Example', email: 'riley@example.com' },
  rental: { address: '410 Example Street', unit: 'Unit 1' },
  lines: [
    { description: 'Rent — October 2026', amount: 1450 },
    { description: 'Credit — September repair reimbursement', amount: -50 },
  ],
  note: null,
}

export const SAMPLE_RECEIPT: SampleReceipt = {
  number: 'A-RCT-000001',
  paymentDate: '2026-10-03',
  receivedFrom: 'Riley Example',
  method: 'Zelle',
  reference: 'ZX-2044',
  amount: 1400,
  applied: [{ invoiceNumber: 'A-INV-000001', periodLabel: 'October 2026', amount: 1400, remaining: 0 }],
  rental: { address: '410 Example Street', unit: 'Unit 1' },
  note: null,
}
