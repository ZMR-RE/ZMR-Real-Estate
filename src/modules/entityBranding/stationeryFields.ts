// Where every printed field comes from (numbers match the markers on the
// live preview). Every issuer/branding value is copied into an issued
// document's snapshot, so later settings changes never alter it.

export interface FieldSource {
  n: number
  field: string
  source: string
}

const HEADER: FieldSource[] = [
  { n: 1, field: 'Logo', source: 'Settings › Entities › Branding & documents (current logo version)' },
  { n: 2, field: 'Entity name', source: 'Entity profile › Identity (display name, else legal name)' },
  { n: 3, field: 'Legal name line', source: 'Entity profile › Identity; shown when it differs (can be hidden in Branding & documents)' },
  { n: 4, field: 'Address', source: 'Entity profile › Identity (mailing address)' },
  { n: 5, field: 'Phone · website', source: 'Branding & documents (contact details)' },
]

export const INVOICE_FIELDS: FieldSource[] = [
  ...HEADER,
  { n: 6, field: 'Invoice number', source: 'Assigned at issue from the entity’s invoice code and its own invoice sequence' },
  { n: 7, field: 'Issue date', source: 'Set when the invoice is issued' },
  { n: 8, field: 'Due date', source: 'Tenancy & billing (due day); editable on the draft' },
  { n: 9, field: 'Billing period', source: 'The month the invoice was drafted for' },
  { n: 10, field: 'Bill to', source: 'Billing recipients on the tenancy — names, emails and phones from their tenant profiles (blank ones omitted)' },
  { n: 11, field: 'Rental', source: 'Property address and unit of the tenancy' },
  { n: 12, field: 'Lines', source: 'Rent and charges from the tenancy (invoicing release)' },
  { n: 13, field: 'Amount due', source: 'Total of the lines' },
  { n: 14, field: 'How to pay', source: 'Branding & documents (payment instructions); a property-level override is part of the invoicing release' },
  { n: 15, field: 'Note', source: 'The draft’s note — tenant note, else the entity’s default invoice note' },
  { n: 16, field: 'Footer', source: 'Branding & documents (reply-to email, footer text); legal name from Identity' },
  { n: 17, field: 'Earlier unpaid invoices', source: 'Other issued invoices for this tenancy with a balance — references only, never added to the total (invoicing release)' },
]

export const RECEIPT_FIELDS: FieldSource[] = [
  ...HEADER,
  { n: 6, field: 'Receipt number', source: 'Assigned at issue from the entity’s code and its separate receipt sequence' },
  { n: 7, field: 'Payment date', source: 'The recorded payment' },
  { n: 8, field: 'Received from', source: 'Payer on the recorded payment — contact details from their tenant profile' },
  { n: 9, field: 'Method · reference', source: 'The recorded payment' },
  { n: 10, field: 'Amount received', source: 'The recorded payment' },
  { n: 11, field: 'Applied to', source: 'The payment’s allocations to issued invoices, with remaining balances' },
  { n: 12, field: 'Rental', source: 'Property address and unit of the tenancy' },
  { n: 13, field: 'Note', source: 'Branding & documents (default receipt note)' },
  { n: 14, field: 'Footer', source: 'Branding & documents (reply-to email, footer text); legal name from Identity' },
]
