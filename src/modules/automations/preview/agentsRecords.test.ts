import { describe, expect, it } from 'vitest'
import { buildPopulatedAgents } from './agentFixtures'
import { documentFilename, formatDocNumber } from './agentNumbering'
import { checkAllocations, linkNoticeToPayment, possibleDuplicate, recordNoticeAsPayment } from './agentPayments'
import { commitNumber, reserveNumber, type NumberReservation } from './agentIssuance'
import { acquireRunLock, simulatePracticeRun } from './agentPreviewActions'
import { applyAssistantEdit, cancelInvoice, createOwnerInvoice, decideInvoice, decideReceipt, editInvoice, issueInvoice, issueInvoiceWith, issueReceipt, reviseInvoice } from './agentRecordEdits'
import { buildRecordStore, invoice } from './agentRecordFixtures'
import { invoiceBalance, invoiceStatus, isApprovalValid, workloadFor } from './agentRecords'

const TODAY = '2026-10-30'
const NOW = '2026-10-30T10:00:00'
const inv = (s: ReturnType<typeof buildRecordStore>, id: string) => s.invoices.find((i) => i.id === id)!

describe('single source of truth', () => {
  it('Workload is a filter of the shared store, not a copy', () => {
    const store = buildRecordStore()
    const w = workloadFor(buildPopulatedAgents()[0], store)
    expect(w.invoices[0]).toBe(store.invoices.find((i) => i.id === w.invoices[0].id))
  })

  it('an edit to a draft shows through every view of that record', () => {
    const agent = buildPopulatedAgents()[0]
    const s = editInvoice(buildRecordStore(), 'inv-riley-nov', { visibleNote: 'Updated' })
    expect(workloadFor(agent, s).invoices.find((i) => i.id === 'inv-riley-nov')?.visibleNote).toBe('Updated')
  })

  it('drafts carry no payment status and no number', () => {
    const s = buildRecordStore()
    expect(invoiceStatus(s, inv(s, 'inv-riley-nov'), TODAY)).toBe('draft')
    expect(inv(s, 'inv-riley-nov').number).toBeNull()
  })
})

describe('approval invalidation', () => {
  it('only a strictly internal note keeps approval', () => {
    let s = buildRecordStore()
    expect(isApprovalValid(inv(s, 'inv-casey-nov'))).toBe(true)
    s = editInvoice(s, 'inv-casey-nov', { internalNote: 'Checked against lease' })
    expect(isApprovalValid(inv(s, 'inv-casey-nov'))).toBe(true)
  })

  it.each([
    ['amount', { amountDue: 1800 }],
    ['recipient', { recipientName: 'C. Placeholder' }],
    ['recipient email', { recipientEmail: 'casey@example.com' }],
    ['note shown on the invoice', { visibleNote: 'Thanks!' }],
    ['attachments', { attachmentIds: ['demo-lease-summary'] }],
    ['due date', { dueDate: '2026-11-03' }],
    ['issuer', { issuerEntityId: 'ent-example-holdings' }],
  ])('changing the %s clears approval', (label, edit) => {
    const s = editInvoice(buildRecordStore(), 'inv-casey-nov', edit)
    expect(inv(s, 'inv-casey-nov').state).toBe('draft')
    expect(inv(s, 'inv-casey-nov').approvalNote).toContain(label)
  })

  it('issued invoices cannot be edited in place', () => {
    const s = editInvoice(buildRecordStore(), 'inv-riley-oct', { amountDue: 1 })
    expect(inv(s, 'inv-riley-oct').amountDue).toBe(1450)
  })
})

describe('edits made while the assistant is working', () => {
  it('holds the assistant change when the record moved on', () => {
    const s0 = buildRecordStore()
    const s1 = editInvoice(s0, 'inv-riley-nov', { internalNote: 'owner edit' })
    const s2 = applyAssistantEdit(s1, 'inv-riley-nov', 1, { amountDue: 999 }, 'run-9')
    expect(inv(s2, 'inv-riley-nov').amountDue).toBe(1450)
    expect(inv(s2, 'inv-riley-nov').editConflict).toMatch(/run-9/)
  })

  it('applies the change when the version is current', () => {
    const s = applyAssistantEdit(buildRecordStore(), 'inv-riley-nov', 1, { visibleNote: 'agent note' }, 'run-9')
    expect(inv(s, 'inv-riley-nov').visibleNote).toBe('agent note')
  })
})

describe('per-entity numbering and filenames (owner-approved format)', () => {
  it('each issuer advances its own invoice sequence independently', () => {
    let s = buildRecordStore()
    s = editInvoice(s, 'inv-riley-nov', { dueDate: '2026-11-01' })
    s = decideInvoice(s, 'inv-riley-nov', 'approve')
    s = issueInvoice(s, 'inv-riley-nov', '410 Example Street — Unit 1', NOW)
    s = issueInvoice(s, 'inv-casey-nov', '27 Sample Road — Unit A', NOW)
    expect(inv(s, 'inv-riley-nov').number).toBe('EXH-INV-000009')
    expect(inv(s, 'inv-casey-nov').number).toBe('SRP-INV-000003')
    expect(inv(s, 'inv-riley-nov').documents[0].filename).toBe('EXH-INV-000009_2026-11_410-Example-St-Unit-1.pdf')
    expect(s.entities.find((e) => e.id === 'ent-example-holdings')?.nextInvoiceSeq).toBe(10)
    expect(s.entities.find((e) => e.id === 'ent-example-holdings')?.nextReceiptSeq).toBe(5)
  })

  it('refuses to issue without approval, due date, issuer or short code', () => {
    let s = buildRecordStore()
    s = issueInvoice(s, 'inv-riley-nov', 'x', NOW)
    expect(inv(s, 'inv-riley-nov').state).toBe('draft')
    s = editInvoice(s, 'inv-riley-nov', { dueDate: '2026-11-01', issuerEntityId: 'ent-placeholder-partners' })
    s = decideInvoice(s, 'inv-riley-nov', 'approve')
    s = issueInvoice(s, 'inv-riley-nov', 'x', NOW)
    expect(inv(s, 'inv-riley-nov').number).toBeNull()
  })

  it('receipts use the issuer’s separate receipt sequence', () => {
    let s = decideReceipt(buildRecordStore(), 'rct-casey-sep-1', 'approve')
    s = issueReceipt(s, 'rct-casey-sep-1', '27 Sample Road — Unit A', NOW)
    const r = s.receipts.find((x) => x.id === 'rct-casey-sep-1')!
    expect(r.number).toBe('SRP-RCT-000001')
    expect(r.documents[0].filename).toBe('SRP-RCT-000001_2026-09-28_27-Sample-Rd-Unit-A.pdf')
  })

  it('formats per the proposal', () => {
    expect(formatDocNumber({ id: 'e', legalName: 'E', shortCode: 'ABC', nextInvoiceSeq: 1, nextReceiptSeq: 1 }, 'invoice', 42)).toBe('ABC-INV-000042')
    expect(documentFilename('ABC-INV-000042-R2', '2026-12', '9 Placeholder Lane — Main')).toBe('ABC-INV-000042-R2_2026-12_9-Placeholder-Ln-Main.pdf')
  })
})

describe('revisions preserve issued documents', () => {
  it('a revision keeps the number with -R suffix and supersedes, never deletes, the original', () => {
    let s = reviseInvoice(buildRecordStore(), 'inv-riley-oct')
    const rev = s.invoices.find((i) => i.revisionOf === 'inv-riley-oct')!
    s = editInvoice(s, rev.id, { visibleNote: 'Corrected note' })
    s = decideInvoice(s, rev.id, 'approve')
    s = issueInvoice(s, rev.id, '410 Example Street — Unit 1', NOW)
    expect(inv(s, rev.id).number).toBe('EXH-INV-000007-R2')
    expect(inv(s, 'inv-riley-oct').state).toBe('superseded')
    expect(inv(s, 'inv-riley-oct').documents).toHaveLength(1)
    expect(s.entities.find((e) => e.id === 'ent-example-holdings')?.nextInvoiceSeq).toBe(9)
  })
})

describe('payments: evidence, separate events, allocations, no duplicates', () => {
  it('flags a notice matching an already-recorded payment and links it without a new entry', () => {
    const s0 = buildRecordStore()
    const notice = s0.notices.find((n) => n.id === 'ntc-casey-700')!
    const dup = possibleDuplicate(s0, notice)
    expect(dup?.id).toBe('pay-casey-sep-1')
    const s1 = linkNoticeToPayment(s0, notice.id, dup!.id)
    expect(s1.payments).toHaveLength(s0.payments.length)
    expect(s1.payments.find((p) => p.id === dup!.id)?.evidenceNoticeIds).toContain(notice.id)
  })

  it('records one payment with the owner’s explicit split and refuses a second recording', () => {
    const s0 = buildRecordStore()
    const split = [
      { invoiceId: 'inv-casey-sep-r2', amount: 1020 },
      { invoiceId: 'inv-casey-oct', amount: 1720 },
    ]
    const s1 = recordNoticeAsPayment(s0, 'ntc-casey-2740', split, 'ent-sample-road', true)
    const s2 = recordNoticeAsPayment(s1, 'ntc-casey-2740', split, 'ent-sample-road', true)
    expect(s2.payments).toHaveLength(s0.payments.length + 1)
    expect(s2.payments.at(-1)?.allocations).toEqual(split)
    expect(invoiceBalance(s2, inv(s2, 'inv-casey-sep-r2'))).toBe(0)
    expect(invoiceStatus(s2, inv(s2, 'inv-casey-oct'), TODAY)).toBe('paid')
    expect(s2.receipts.filter((r) => r.paymentId === 'pay-ntc-casey-2740')).toHaveLength(1)
  })

  it('applies no split automatically — an empty split leaves the whole payment unapplied', () => {
    const s = recordNoticeAsPayment(buildRecordStore(), 'ntc-casey-2740', [], 'ent-sample-road', false)
    expect(s.payments.at(-1)?.allocations).toEqual([])
    expect(invoiceBalance(s, inv(s, 'inv-casey-sep-r2'))).toBe(1020)
  })

  it('refuses allocations over an invoice balance or over the payment', () => {
    const s = buildRecordStore()
    expect(checkAllocations(s, 'asg-casey', 2740, [{ invoiceId: 'inv-casey-sep-r2', amount: 1500 }]).ok).toBe(false)
    expect(checkAllocations(s, 'asg-casey', 1000, [{ invoiceId: 'inv-casey-oct', amount: 1200 }]).ok).toBe(false)
    expect(checkAllocations(s, 'asg-casey', 2740, [{ invoiceId: 'inv-riley-oct', amount: 10 }]).ok).toBe(false)
    const after = recordNoticeAsPayment(s, 'ntc-casey-2740', [{ invoiceId: 'inv-casey-oct', amount: 1200 }, { invoiceId: 'inv-casey-sep-r2', amount: 2000 }], null, false)
    expect(after.payments).toHaveLength(s.payments.length)
  })
})

describe('practice run', () => {
  it('creates drafts in the shared store once per tenant and month', () => {
    const agent = buildPopulatedAgents()[0]
    const r1 = simulatePracticeRun(agent, buildRecordStore(), new Date(NOW), '2026-12', 'December 2026')
    const r2 = simulatePracticeRun(r1.agent, r1.store, new Date(NOW), '2026-12', 'December 2026')
    expect(r1.agent.runs[0].draftsCreated).toBe(3)
    expect(r2.agent.runs[0].draftsCreated).toBe(0)
    expect(r2.store.invoices.filter((i) => i.periodKey === '2026-12')).toHaveLength(3)
  })
})

describe('issuance protection per entity × document type (every path)', () => {
  it('two paths reserving from the same snapshot never share a number', () => {
    let s = buildRecordStore()
    s = editInvoice(s, 'inv-riley-nov', { dueDate: '2026-11-01' })
    s = decideInvoice(s, 'inv-riley-nov', 'approve')
    // Owner-created manual invoice for the same issuer, approved at the same time.
    s = createOwnerInvoice(s, invoice({ id: 'inv-owner-manual', assignmentId: 'asg-jordan', issuerEntityId: 'ent-example-holdings', periodLabel: 'November 2026 (parking)', periodKey: '2026-11', amountDue: 75, dueDate: '2026-11-01' }))
    s = decideInvoice(s, 'inv-owner-manual', 'approve')
    const snapshot = s
    const assistantRes = reserveNumber(snapshot, 'ent-example-holdings', 'invoice') as NumberReservation
    const ownerRes = reserveNumber(snapshot, 'ent-example-holdings', 'invoice') as NumberReservation
    expect(assistantRes.number).toBe(ownerRes.number)
    const afterAssistant = issueInvoiceWith(snapshot, 'inv-riley-nov', assistantRes, 'Unit', NOW)!
    expect(inv(afterAssistant, 'inv-riley-nov').number).toBe('EXH-INV-000009')
    // The second path's reservation is now stale: refused, nothing written.
    expect(issueInvoiceWith(afterAssistant, 'inv-owner-manual', ownerRes, 'Unit', NOW)).toBeNull()
    expect(commitNumber(afterAssistant, ownerRes)).toBeNull()
    // Re-reserving gets the next number.
    const retried = issueInvoice(afterAssistant, 'inv-owner-manual', 'Unit', NOW)
    expect(inv(retried, 'inv-owner-manual').number).toBe('EXH-INV-000010')
  })

  it('invoice and receipt sequences of one entity are independent', () => {
    let s = decideReceipt(buildRecordStore(), 'rct-casey-sep-1', 'approve')
    s = issueReceipt(s, 'rct-casey-sep-1', 'Unit', NOW)
    s = issueInvoice(s, 'inv-casey-nov', 'Unit', NOW)
    expect(s.receipts.find((r) => r.id === 'rct-casey-sep-1')?.number).toBe('SRP-RCT-000001')
    expect(inv(s, 'inv-casey-nov').number).toBe('SRP-INV-000003')
  })
})

describe('approved numbering rules: issuance-only, never reused, one run at a time', () => {
  it('a cancelled number is kept and the next issue takes a new one', () => {
    let s = cancelInvoice(buildRecordStore(), 'inv-riley-oct')
    expect(inv(s, 'inv-riley-oct')).toMatchObject({ state: 'cancelled', number: 'EXH-INV-000007' })
    s = editInvoice(s, 'inv-riley-nov', { dueDate: '2026-11-01' })
    s = decideInvoice(s, 'inv-riley-nov', 'approve')
    s = issueInvoice(s, 'inv-riley-nov', '410 Example Street — Unit 1', NOW)
    expect(inv(s, 'inv-riley-nov').number).toBe('EXH-INV-000009')
    const numbers = s.invoices.map((i) => i.number).filter(Boolean)
    expect(new Set(numbers).size).toBe(numbers.length)
  })

  it('issuing the same record twice never consumes a second number', () => {
    let s = issueInvoice(buildRecordStore(), 'inv-casey-nov', '27 Sample Road — Unit A', NOW)
    s = issueInvoice(s, 'inv-casey-nov', '27 Sample Road — Unit A', NOW)
    expect(s.entities.find((e) => e.id === 'ent-sample-road')?.nextInvoiceSeq).toBe(4)
  })

  it('refuses a second run while one holds the lock', () => {
    const agent = buildPopulatedAgents()[0]
    const locked = acquireRunLock(agent, 'run-a')!
    expect(acquireRunLock(locked, 'run-b')).toBeNull()
    const r = simulatePracticeRun(locked, buildRecordStore(), new Date(NOW), '2026-12', 'December 2026')
    expect(r.agent.runs).toHaveLength(agent.runs.length)
  })
})
