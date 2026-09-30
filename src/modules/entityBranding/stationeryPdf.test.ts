import { jsPDF } from 'jspdf'
import { describe, expect, it } from 'vitest'
import { brandingInputFrom, stationeryFrom } from './brandingMapping'
import { sampleInvoice, sampleReceipt } from './sampleDocuments'
import { INVOICE_FIELDS, RECEIPT_FIELDS } from './stationeryFields'
import { EMPTY_STATIONERY, invoiceTotals } from './stationeryLogic'
import { personLines, renderEntityDocument } from './stationeryPdf'
import type { EntityIdentity } from './stationeryTypes'

const entity: EntityIdentity = { legalName: 'Example Holdings LLC', displayName: 'Example Holdings', mailingAddress: '100 Main Street', mailingCity: 'Springfield', mailingState: 'IL', mailingZip: '62701' }
const withBranding = { ...EMPTY_STATIONERY, contact: { replyTo: 'billing@example.com', phone: '(555) 010-2030', website: 'example.com' }, paymentInstructions: 'Zelle to billing@example.com' }

describe('entity documents', () => {
  it('billed people: name, then email · phone only when present', () => {
    expect(personLines([{ name: 'A', email: 'a@example.com', phone: '(555) 1' }, { name: 'B', email: null, phone: null }, { name: 'C', email: null, phone: '(555) 3' }])).toEqual(['A', 'a@example.com · (555) 1', 'B', 'C', '(555) 3'])
  })

  it('invoice prints the effective payment instructions and billed tenants’ contacts', () => {
    const out = renderEntityDocument(jsPDF, entity, withBranding, { kind: 'invoice', data: sampleInvoice('Property-specific: check to the site office', null) }).output()
    expect(out).toContain('Property-specific: check to the site office')
    expect(out).not.toContain('Zelle to billing@example.com')
    expect(out).toContain('tenant.one@example.com')
    expect(out).toContain('Sample Tenant Two')
  })

  it('a draft prints its status and "On issue" instead of an issue date', () => {
    const out = renderEntityDocument(jsPDF, entity, withBranding, { kind: 'invoice', data: { ...sampleInvoice(null, null), issueDate: null, status: 'DRAFT — NOT ISSUED' } }).output()
    expect(out).toContain('DRAFT')
    expect(out).toContain('On issue')
  })

  it('earlier unpaid: never a charge on this invoice; counted once in the labelled tenancy total', () => {
    const base = sampleInvoice(null, null)
    const inv = { ...base, priorUnpaid: [{ number: 'A-INV-000003', periodLabel: 'September 2026', outstanding: 1450 }, { number: 'A-INV-000004', periodLabel: 'October 2026', outstanding: 200.1 }] }
    const out = renderEntityDocument(jsPDF, entity, withBranding, { kind: 'invoice', data: inv }).output()
    expect(out).toContain('NOT CHARGED AGAIN')
    expect(out).toContain('A-INV-000003')
    expect(out).toMatch(/Amount due .{1,4} this invoice/)
    expect(out).toContain('$1,400.00')
    expect(out).toContain('Total outstanding for this tenancy')
    expect(out).toContain('$3,050.10')
    expect(inv.lines).toEqual(base.lines)
    // Through an explicit continuity link, the earlier tenancy is named.
    const renewal = { ...base, priorUnpaid: [{ number: 'A-INV-000003', periodLabel: 'September 2026', outstanding: 1450, fromTenancy: '410 Example Street — Unit 1' }] }
    const outR = renderEntityDocument(jsPDF, entity, withBranding, { kind: 'invoice', data: renewal }).output()
    expect(outR).toContain('earlier tenancy, 410 Example Street')
    expect(outR).toContain('the one it continues')
    // Without earlier unpaid invoices there is one plain total.
    const plain = renderEntityDocument(jsPDF, entity, withBranding, { kind: 'invoice', data: base }).output()
    expect(plain).not.toContain('Total outstanding')
  })

  it('totals are exact to the cent', () => {
    expect(invoiceTotals([{ amount: 0.1 }, { amount: 0.2 }], [{ outstanding: 0.3 }])).toEqual({ thisInvoice: 0.3, earlierUnpaid: 0.3, tenancyOutstanding: 0.6 })
  })

  it('without a logo the entity name starts on the top line (no reserved space); with one it moves below', () => {
    const placed = (withLogo: boolean) => {
      const calls: { t: unknown; y: number }[] = []
      // jsPDF attaches `text` per instance, so wrap it on the created doc.
      const SpyPdf = function (options: ConstructorParameters<typeof jsPDF>[0]) {
        const doc = new jsPDF(options)
        const original = doc.text.bind(doc)
        doc.text = ((...args: Parameters<typeof original>) => {
          calls.push({ t: args[0], y: args[2] as number })
          return original(...args)
        }) as typeof doc.text
        return doc
      } as unknown as typeof jsPDF
      const logo = withLogo ? { dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', format: 'PNG' as const, width: 240, height: 80, name: 'x' } : null
      renderEntityDocument(SpyPdf, entity, { ...withBranding, logo }, { kind: 'invoice', data: sampleInvoice(null, null) })
      const y = (t: string) => calls.find((c) => c.t === t)!.y
      return { name: y('Example Holdings'), title: y('INVOICE') }
    }
    const without = placed(false)
    expect(without.name).toBe(without.title)
    const withLogo = placed(true)
    expect(withLogo.name).toBeGreaterThan(withLogo.title)
  })

  it('receipt confirms a recorded payment and never claims sent', () => {
    const out = renderEntityDocument(jsPDF, entity, withBranding, { kind: 'receipt', data: sampleReceipt(null) }).output()
    expect(out).toContain('not a bank statement')
    expect(out).not.toMatch(/\bsent\b/i)
  })

  it('field legends are numbered 1..n', () => {
    for (const list of [INVOICE_FIELDS, RECEIPT_FIELDS]) expect(list.map((f) => f.n)).toEqual(list.map((_, i) => i + 1))
  })

  it('maps stored settings to the form and back without inventing values', () => {
    const s = stationeryFrom(null, null)
    expect(s).toEqual(EMPTY_STATIONERY)
    const input = brandingInputFrom({ ...s, colors: { heading: '#1f4e79' }, contact: { replyTo: ' ', phone: '', website: '' } }, 'logo-1')
    expect(input.heading_color).toBe('#1F4E79')
    expect(input.reply_to_email).toBeNull()
    expect(input.current_logo_id).toBeNull()
  })
})
