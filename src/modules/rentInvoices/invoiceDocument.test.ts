import { jsPDF } from 'jspdf'
import { describe, expect, it } from 'vitest'
import { renderEntityDocument } from '../entityBranding/stationeryPdf'
import { buildInvoiceRender, changedSinceApproval, invoiceFilename, paymentInstructionsSource, unitSlug } from './invoiceDocument'
import { snapshot } from './invoiceSampleFixtures'

const pdfText = (r: ReturnType<typeof buildInvoiceRender>) => renderEntityDocument(jsPDF, r.entity, r.stationery, { kind: 'invoice', data: r.doc }).output()

describe('invoice document from the print snapshot', () => {
  it('an issued invoice prints its number, issue date, recipients and snapshotted instructions', () => {
    const r = buildInvoiceRender(snapshot, { number: 'A-INV-000001', issuedAt: '2026-09-25T15:00:00Z' }, null)
    expect(r.isDraft).toBe(false)
    expect(r.filename).toBe('A-INV-000001_2026-10_Unit-1.pdf')
    expect(r.total).toBe(1460)
    const out = pdfText(r)
    expect(out).toContain('A-INV-000001')
    expect(out).toContain('September 25, 2026')
    expect(out).toContain('riley@example.com')
    expect(out).toContain('Zelle to billing@example.com')
    expect(out).toContain('Pest control')
    expect(out).not.toMatch(/\bsent\b/i)
  })

  it('a draft has no number and says so', () => {
    const r = buildInvoiceRender(snapshot, null, null)
    expect(r.filename).toBe('DRAFT_2026-10_Unit-1.pdf')
    const out = pdfText(r)
    expect(out).toContain('DRAFT')
    expect(out).toContain('Assigned on issue')
    expect(out).toContain('On issue')
  })

  it('a revision says which number it replaces', () => {
    const out = pdfText(buildInvoiceRender({ ...snapshot, revision: 2, revision_of_number: 'A-INV-000001' }, { number: 'A-INV-000001-R2', issuedAt: '2026-10-02T00:00:00Z' }, null))
    expect(out).toContain('REPLACES A-INV-000001')
  })

  it('names where the payment instructions come from', () => {
    expect(paymentInstructionsSource(snapshot)).toMatch(/Example Holdings’s default/)
    expect(paymentInstructionsSource({ ...snapshot, payment_instructions: { text: 'x', source: 'property' } })).toMatch(/property’s own/)
    expect(paymentInstructionsSource({ ...snapshot, payment_instructions: { text: null, source: null } })).toBeNull()
  })

  it('refuses to show an invoice with no issuing entity', () => {
    expect(() => buildInvoiceRender({ ...snapshot, issuer: null }, null, null)).toThrow(/issuing entity/)
  })

  it('reports what printed content changed since approval, in plain words', () => {
    expect(changedSinceApproval(snapshot, snapshot)).toEqual([])
    const changed = changedSinceApproval(snapshot, {
      ...snapshot,
      payment_instructions: { text: 'Check to the site office', source: 'property' },
      recipients: [{ ...snapshot.recipients[0], phone: null }],
    })
    expect(changed).toEqual(['payment instructions', 'billed tenants or their contact details'])
    // Same values with keys in a different order are equal.
    const reordered = { lines: snapshot.lines.map((l) => ({ amount: l.amount, description: l.description, kind: l.kind })) }
    expect(changedSinceApproval(snapshot, { ...snapshot, ...reordered })).toEqual([])
  })

  it('follows the approved filename convention', () => {
    expect(invoiceFilename('A-INV-000001-R2', '2026-10-01', 'Apt #3B')).toBe('A-INV-000001-R2_2026-10_Apt-3B.pdf')
    expect(unitSlug('  ')).toBe('Unit')
  })
})
