import { jsPDF } from 'jspdf'
import { describe, expect, it } from 'vitest'
import { INVOICE_FIELDS, RECEIPT_FIELDS } from './stationeryFields'
import { SAMPLE_ENTITY, SAMPLE_INVOICE, SAMPLE_RECEIPT, SAMPLE_STATIONERY } from './stationeryFixtures'
import { EMPTY_STATIONERY, resolveColors } from './stationeryLogic'
import { renderStationeryPdf } from './stationeryPdf'

describe('stationery preview documents', () => {
  it('sample colours pass the contrast rules', () => {
    expect(resolveColors(SAMPLE_STATIONERY).warnings).toEqual([])
  })

  it('renders an invoice from entity + stationery + record, never claiming sent or paid', () => {
    const out = renderStationeryPdf(jsPDF, SAMPLE_ENTITY, SAMPLE_STATIONERY, { kind: 'invoice', data: SAMPLE_INVOICE }, false).output()
    for (const text of ['A-INV-000001', 'Example Holdings', '010-2030', '$1,400.00', 'HOW TO PAY', 'Please include the invoice number']) expect(out).toContain(text)
    expect(out).not.toMatch(/\bsent\b|\bpaid\b(?! payable)/i)
  })

  it('renders a receipt that only confirms a recorded payment', () => {
    const out = renderStationeryPdf(jsPDF, SAMPLE_ENTITY, SAMPLE_STATIONERY, { kind: 'receipt', data: SAMPLE_RECEIPT }, false).output()
    for (const text of ['RECEIPT', 'A-RCT-000001', 'Amount received', 'A-INV-000001', 'not a bank statement']) expect(out).toContain(text)
  })

  it('works with no branding at all (defaults, A4, no logo)', () => {
    const out = renderStationeryPdf(jsPDF, SAMPLE_ENTITY, { ...EMPTY_STATIONERY, defaults: { ...EMPTY_STATIONERY.defaults, paperSize: 'a4' } }, { kind: 'invoice', data: SAMPLE_INVOICE }, true).output()
    expect(out).toContain('A-INV-000001')
  })

  it('numbers every field in the source legend exactly once', () => {
    for (const list of [INVOICE_FIELDS, RECEIPT_FIELDS]) expect(list.map((f) => f.n)).toEqual(list.map((_, i) => i + 1))
  })
})
