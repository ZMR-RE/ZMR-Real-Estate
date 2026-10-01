import type { InvoiceRecord, ReceiptRecord, RecordStore } from './agentTypes'

// FICTIONAL account record store for the preview (preview "today" is
// October 30, 2026). This is the ONE set of invoices, payments and receipts
// that Rent ops, the assistant's Workload and Approvals all read.
// Two issuing entities, each with its own invoice and receipt sequence.

type InvoiceSeed = Pick<InvoiceRecord, 'id' | 'assignmentId' | 'issuerEntityId' | 'periodLabel' | 'periodKey' | 'amountDue' | 'dueDate'> & Partial<InvoiceRecord>

// Fictional bill-to defaults per assignment (tenant name and email on file).
const RECIPIENT: Record<string, { name: string; email: string | null }> = {
  'asg-riley': { name: 'Riley Example', email: 'riley@example.com' },
  'asg-jordan': { name: 'Jordan Sample', email: 'jordan@example.com' },
  'asg-casey': { name: 'Casey Placeholder', email: null },
  'asg-morgan': { name: 'Morgan Demo', email: 'morgan@example.com' },
}

export function invoice(seed: InvoiceSeed): InvoiceRecord {
  const recipient = RECIPIENT[seed.assignmentId]
  return {
    kind: 'invoice',
    state: 'draft',
    number: null,
    revision: 1,
    revisionOf: null,
    documents: [],
    version: 1,
    materialVersion: 1,
    approvedMaterialVersion: null,
    approvalNote: null,
    createdBy: 'owner',
    runId: null,
    editConflict: null,
    reviewBy: null,
    recipientName: recipient?.name ?? '',
    recipientEmail: recipient?.email ?? null,
    visibleNote: '',
    attachmentIds: [],
    internalNote: '',
    ...seed,
  }
}

function issued(seed: InvoiceSeed, number: string, filename: string, issuedAt: string, extra: Partial<InvoiceRecord> = {}): InvoiceRecord {
  return invoice({ ...seed, state: 'issued', number, approvedMaterialVersion: 1, documents: [{ revision: seed.revision ?? 1, filename, issuedAt, deliveries: [] }], ...extra })
}

type ReceiptSeed = Pick<ReceiptRecord, 'id' | 'paymentId' | 'issuerEntityId'> & Partial<ReceiptRecord>

function receipt(seed: ReceiptSeed): ReceiptRecord {
  return {
    kind: 'receipt',
    state: 'draft',
    number: null,
    revision: 1,
    revisionOf: null,
    documents: [],
    version: 1,
    materialVersion: 1,
    approvedMaterialVersion: null,
    approvalNote: null,
    createdBy: 'assistant',
    runId: null,
    editConflict: null,
    reviewBy: null,
    ...seed,
  }
}

const EXH = 'ent-example-holdings'
const SRP = 'ent-sample-road'

export function buildRecordStore(): RecordStore {
  return {
    entities: [
      { id: EXH, legalName: 'Example Holdings LLC', shortCode: 'EXH', nextInvoiceSeq: 9, nextReceiptSeq: 5 },
      { id: SRP, legalName: 'Sample Road Properties LLC', shortCode: 'SRP', nextInvoiceSeq: 3, nextReceiptSeq: 1 },
      { id: 'ent-placeholder-partners', legalName: 'Placeholder Partners LLC', shortCode: null, nextInvoiceSeq: 1, nextReceiptSeq: 1 },
    ],
    invoices: [
      issued({ id: 'inv-riley-sep', assignmentId: 'asg-riley', issuerEntityId: EXH, periodLabel: 'September 2026', periodKey: '2026-09', amountDue: 1450, dueDate: '2026-09-01' }, 'EXH-INV-000005', 'EXH-INV-000005_2026-09_410-Example-St-Unit-1.pdf', '2026-08-25T09:00:00'),
      issued({ id: 'inv-jordan-sep', assignmentId: 'asg-jordan', issuerEntityId: EXH, periodLabel: 'September 2026', periodKey: '2026-09', amountDue: 1395, dueDate: '2026-09-01' }, 'EXH-INV-000006', 'EXH-INV-000006_2026-09_410-Example-St-Unit-2.pdf', '2026-08-25T09:00:00'),
      // Revision demo: R1 showed the wrong unit in its visible note; R2
      // corrected it. Both PDFs kept.
      issued({ id: 'inv-casey-sep', assignmentId: 'asg-casey', issuerEntityId: SRP, periodLabel: 'September 2026', periodKey: '2026-09', amountDue: 1720, dueDate: '2026-09-01', visibleNote: 'Rent — Unit B' }, 'SRP-INV-000001', 'SRP-INV-000001_2026-09_27-Sample-Rd-Unit-A.pdf', '2026-08-25T09:00:00', { state: 'superseded' }),
      issued({ id: 'inv-casey-sep-r2', assignmentId: 'asg-casey', issuerEntityId: SRP, periodLabel: 'September 2026', periodKey: '2026-09', amountDue: 1720, dueDate: '2026-09-01', visibleNote: 'Rent — Unit A', revision: 2, revisionOf: 'inv-casey-sep' }, 'SRP-INV-000001-R2', 'SRP-INV-000001-R2_2026-09_27-Sample-Rd-Unit-A.pdf', '2026-08-27T14:10:00'),
      issued({ id: 'inv-riley-oct', assignmentId: 'asg-riley', issuerEntityId: EXH, periodLabel: 'October 2026', periodKey: '2026-10', amountDue: 1450, dueDate: '2026-10-01' }, 'EXH-INV-000007', 'EXH-INV-000007_2026-10_410-Example-St-Unit-1.pdf', '2026-09-25T09:00:00'),
      issued({ id: 'inv-jordan-oct', assignmentId: 'asg-jordan', issuerEntityId: EXH, periodLabel: 'October 2026', periodKey: '2026-10', amountDue: 1395, dueDate: '2026-10-01' }, 'EXH-INV-000008', 'EXH-INV-000008_2026-10_410-Example-St-Unit-2.pdf', '2026-09-25T09:00:00'),
      issued({ id: 'inv-casey-oct', assignmentId: 'asg-casey', issuerEntityId: SRP, periodLabel: 'October 2026', periodKey: '2026-10', amountDue: 1720, dueDate: '2026-10-01' }, 'SRP-INV-000002', 'SRP-INV-000002_2026-10_27-Sample-Rd-Unit-A.pdf', '2026-09-25T09:00:00'),
      // November drafts from practice run 3 — no numbers until issued.
      invoice({ id: 'inv-riley-nov', assignmentId: 'asg-riley', issuerEntityId: EXH, periodLabel: 'November 2026', periodKey: '2026-11', amountDue: 1450, dueDate: null, createdBy: 'assistant', runId: 'run-3' }),
      invoice({
        id: 'inv-jordan-nov', assignmentId: 'asg-jordan', issuerEntityId: EXH, periodLabel: 'November 2026', periodKey: '2026-11', amountDue: 1395, dueDate: null, createdBy: 'assistant', runId: 'run-3',
        internalNote: 'Includes parking? Confirm with tenant before approving.', version: 2,
        editConflict: 'Changed by you while run run-3 was working. The assistant’s update was not applied over your edit — review before approving.',
      }),
      invoice({ id: 'inv-casey-nov', assignmentId: 'asg-casey', issuerEntityId: SRP, periodLabel: 'November 2026', periodKey: '2026-11', amountDue: 1720, dueDate: '2026-11-01', createdBy: 'assistant', runId: 'run-3', state: 'approved', approvedMaterialVersion: 1 }),
    ],
    payments: [
      { id: 'pay-jordan-sep', assignmentId: 'asg-jordan', amount: 1395, paidDate: '2026-09-01', method: 'Zelle', evidenceNoticeIds: [], allocations: [{ invoiceId: 'inv-jordan-sep', amount: 1395 }] },
      { id: 'pay-casey-sep-1', assignmentId: 'asg-casey', amount: 700, paidDate: '2026-09-28', method: 'Zelle', evidenceNoticeIds: [], allocations: [{ invoiceId: 'inv-casey-sep-r2', amount: 700 }] },
      { id: 'pay-jordan-oct', assignmentId: 'asg-jordan', amount: 1395, paidDate: '2026-10-01', method: 'Zelle', evidenceNoticeIds: [], allocations: [{ invoiceId: 'inv-jordan-oct', amount: 1395 }] },
    ],
    receipts: [
      receipt({ id: 'rct-jordan-sep', paymentId: 'pay-jordan-sep', issuerEntityId: EXH, state: 'issued', number: 'EXH-RCT-000003', approvedMaterialVersion: 1, createdBy: 'owner', documents: [{ revision: 1, filename: 'EXH-RCT-000003_2026-09-01_410-Example-St-Unit-2.pdf', issuedAt: '2026-09-02T10:00:00', deliveries: [] }] }),
      receipt({ id: 'rct-jordan-oct', paymentId: 'pay-jordan-oct', issuerEntityId: EXH, state: 'issued', number: 'EXH-RCT-000004', approvedMaterialVersion: 1, createdBy: 'owner', documents: [{ revision: 1, filename: 'EXH-RCT-000004_2026-10-01_410-Example-St-Unit-2.pdf', issuedAt: '2026-10-02T10:00:00', deliveries: [] }] }),
      receipt({ id: 'rct-casey-sep-1', paymentId: 'pay-casey-sep-1', issuerEntityId: SRP }),
    ],
    reminders: [{ id: 'rem-riley-sep', invoiceId: 'inv-riley-sep', state: 'pending', reviewBy: null }],
    notices: [
      { id: 'ntc-casey-700', assignmentId: 'asg-casey', receivedAt: '2026-09-28T18:04:00', sender: 'Sample bank alerts (fictional)', summary: 'Casey Placeholder sent you $700.00', amount: 700, reference: 'ZX-1001', state: 'pending', outcomePaymentId: null },
      { id: 'ntc-casey-2740', assignmentId: 'asg-casey', receivedAt: '2026-10-29T09:12:00', sender: 'Sample bank alerts (fictional)', summary: 'Casey Placeholder sent you $2,740.00', amount: 2740, reference: 'ZX-1044', state: 'pending', outcomePaymentId: null },
      { id: 'ntc-unmatched-250', assignmentId: null, receivedAt: '2026-10-29T12:40:00', sender: 'Sample bank alerts (fictional)', summary: '“J S” sent you $250.00 — memo: “utilities”', amount: 250, reference: null, state: 'pending', outcomePaymentId: null },
    ],
  }
}
