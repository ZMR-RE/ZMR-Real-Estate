// Where every printed field comes from (numbers match the markers drawn on
// the preview PDFs). "Existing" = a field the dashboard already has;
// "Proposed" = part of the Branding & documents proposal awaiting approval.
// Every issuer/branding value is copied into the issued document's snapshot,
// so later settings changes never alter an issued PDF.

export interface FieldSource {
  n: number
  field: string
  source: string
  status: 'Existing' | 'Proposed' | 'Record'
}

const HEADER: FieldSource[] = [
  { n: 1, field: 'Logo', source: 'Entity profile › Branding & documents', status: 'Proposed' },
  { n: 2, field: 'Entity name', source: 'Entity profile › Identity (display name, else legal name)', status: 'Existing' },
  { n: 3, field: 'Legal name line', source: 'Entity profile › Identity (legal name); shown when it differs — Branding & documents can hide it', status: 'Existing' },
  { n: 4, field: 'Address', source: 'Entity profile › Identity (mailing address)', status: 'Existing' },
  { n: 5, field: 'Phone · website', source: 'Entity profile › Branding & documents (contact for documents)', status: 'Proposed' },
]

export const INVOICE_FIELDS: FieldSource[] = [
  ...HEADER,
  { n: 6, field: 'Invoice number', source: 'Assigned at issue: entity invoice code (Entity profile › Invoicing) + that entity’s invoice sequence', status: 'Record' },
  { n: 7, field: 'Issue date', source: 'Set when you issue the invoice', status: 'Record' },
  { n: 8, field: 'Due date', source: 'Tenant profile › Tenancy & billing (due day); editable on the draft', status: 'Existing' },
  { n: 9, field: 'Billing period', source: 'The month chosen when the draft was created', status: 'Record' },
  { n: 10, field: 'Bill to', source: 'Tenant profile › Tenancy & billing (billing recipients); editable on the draft', status: 'Existing' },
  { n: 11, field: 'Rental', source: 'Property address and unit of the tenancy', status: 'Existing' },
  { n: 12, field: 'Lines', source: 'Lease rent (prorated per Tenancy & billing); charges and credits added on the draft', status: 'Record' },
  { n: 13, field: 'Amount due', source: 'Total of the lines', status: 'Record' },
  { n: 14, field: 'How to pay', source: 'Entity profile › Invoicing (payment instructions)', status: 'Existing' },
  { n: 15, field: 'Note', source: 'The draft’s visible note — prefilled from the tenant note, else the entity’s default invoice note', status: 'Proposed' },
  { n: 16, field: 'Footer', source: 'Entity profile › Invoicing (reply-to email) + Branding & documents (footer text)', status: 'Proposed' },
]

export const RECEIPT_FIELDS: FieldSource[] = [
  ...HEADER,
  { n: 6, field: 'Receipt number', source: 'Assigned at issue: entity invoice code + that entity’s separate receipt sequence (…-RCT-000001)', status: 'Record' },
  { n: 7, field: 'Payment date', source: 'The owner-confirmed payment record (Rent ops)', status: 'Record' },
  { n: 8, field: 'Received from', source: 'Payment record — payer', status: 'Record' },
  { n: 9, field: 'Method · reference', source: 'Payment record', status: 'Record' },
  { n: 10, field: 'Amount received', source: 'Payment record', status: 'Record' },
  { n: 11, field: 'Applied to', source: 'Payment allocations to issued invoices, with each invoice’s remaining balance', status: 'Record' },
  { n: 12, field: 'Rental', source: 'Property address and unit of the tenancy', status: 'Existing' },
  { n: 13, field: 'Note', source: 'Entity profile › Branding & documents (default receipt note)', status: 'Proposed' },
  { n: 14, field: 'Footer', source: 'Entity profile › Invoicing (reply-to email) + Branding & documents (footer text)', status: 'Proposed' },
]
