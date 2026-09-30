import { jsPDF } from 'jspdf'
import { describe, expect, it } from 'vitest'
import { buildInvoiceDocument, invoiceFilename, unitSlug } from './invoiceDocument'
import { renderInvoicePdf } from './invoicePdf'
import { draftContext, issued } from './invoiceSampleFixtures'

describe('invoice document model', () => {
  it('renders an issued invoice only from its snapshots', () => {
    const m = buildInvoiceDocument(issued, draftContext)
    expect(m.isDraft).toBe(false)
    expect(m.number).toBe('A-INV-000001')
    expect(m.issuer.paymentInstructions).toMatch(/^Zelle/)
    expect(m.property.unit).toBe('Unit 1')
    expect(m.lines.map((l) => l.amount)).toEqual([1450, -50])
    expect(m.total).toBe(1400)
    expect(m.filename).toBe('A-INV-000001_2026-10_Unit-1.pdf')
  })

  it('never prints the internal note', () => {
    expect(JSON.stringify(buildInvoiceDocument(issued, null))).not.toContain('never printed')
  })

  it('marks a draft, gives it no number and uses current values', () => {
    const m = buildInvoiceDocument({ ...issued, state: 'approved', number: null, issuer_snapshot: null, recipient_snapshot: null, issued_at: null }, draftContext)
    expect(m.isDraft).toBe(true)
    expect(m.number).toBeNull()
    expect(m.issueDate).toBeNull()
    expect(m.issuer.paymentInstructions).toBe('CHANGED LATER')
    expect(m.filename).toBe('DRAFT_2026-10_Unit-2.pdf')
  })

  it('refuses to render an issued invoice without snapshots', () => {
    expect(() => buildInvoiceDocument({ ...issued, issuer_snapshot: null }, draftContext)).toThrow()
  })

  it('follows the approved filename convention', () => {
    expect(invoiceFilename('A-INV-000001', '2026-10-01', 'Unit 1')).toBe('A-INV-000001_2026-10_Unit-1.pdf')
    expect(invoiceFilename('A-INV-000001-R2', '2026-10-01', 'Apt #3B')).toBe('A-INV-000001-R2_2026-10_Apt-3B.pdf')
    expect(unitSlug('  ')).toBe('Unit')
  })
})

describe('invoice PDF', () => {
  const text = (m: ReturnType<typeof buildInvoiceDocument>) => renderInvoicePdf(jsPDF, m).output()

  it('contains the number, amounts and payment instructions, and never claims sent or paid', () => {
    const out = text(buildInvoiceDocument(issued, null))
    expect(out).toContain('A-INV-000001')
    expect(out).toContain('$1,450.00')
    expect(out).toContain('$1,400.00')
    expect(out).toContain('Zelle to billing@example.com')
    expect(out).not.toMatch(/\bpaid\b(?! payable)/i)
    expect(out).not.toMatch(/\bsent\b(?! and)/i)
  })

  it('marks drafts clearly', () => {
    const out = text(buildInvoiceDocument({ ...issued, state: 'draft', number: null, issuer_snapshot: null, recipient_snapshot: null, issued_at: null }, draftContext))
    expect(out).toContain('DRAFT')
    expect(out).toContain('Not numbered')
    expect(out).toContain('not issued and not sent')
  })
})
