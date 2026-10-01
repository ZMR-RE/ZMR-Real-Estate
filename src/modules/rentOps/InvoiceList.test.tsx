import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { InvoiceList } from './InvoiceList'
import type { Invoice } from './rentOpsQueries'

// G2: the issued list must keep every invoice's identity, amount, status and
// Record payment visible at any width. In the stacked-card layout each cell
// shows its own data-label caption, so every cell needs the caption of its
// column; a closed invoice has no actions, so it shows no empty caption.
const property = { id: 'p', name: '', address: '12345 North Longfellow Boulevard Extension' }
const base: Invoice = {
  id: 'i1', property_id: 'p', billed_to: 'Riley Alexandra Example-Montgomery', period_start: '2026-10-01', period_end: '2026-10-31',
  amount_due: '1450', due_date: '2026-10-01', notes: null, number: 'A-INV-000001', state: 'issued', lease_id: 'l', property,
  payments: [{ id: 'pay', amount: '600', paid_date: '2026-10-03', method: null, notes: null }],
}
const cancelled: Invoice = { ...base, id: 'i2', number: 'A-INV-000002', state: 'cancelled', payments: [] }

describe('issued invoice list', () => {
  const html = renderToStaticMarkup(<InvoiceList invoices={[base, cancelled]} onRecordPayment={() => {}} onOpen={() => {}} />)
  const rows = html.split('<tr').slice(2) // [header, row1, row2] after the thead row

  it('uses the shared responsive list so it can become labelled cards', () => {
    expect(html).toContain('class="table-scroll transaction-list-container"')
    expect(html).toContain('class="transaction-list invoice-issued-table"')
  })

  it('captions each cell with its own column heading, in order', () => {
    const headings = [...html.split('</thead>')[0].matchAll(/<th>([^<]*)<\/th>/g)].map((m) => m[1])
    const labels = [...rows[0].matchAll(/<td data-label="([^"]*)"/g)].map((m) => m[1])
    expect(labels).toEqual(headings)
  })

  it('captions all nine columns, including Actions, on an open invoice', () => {
    for (const label of ['Number', 'Property', 'Billed to', 'Period', 'Amount due', 'Due date', 'Paid', 'Status', 'Actions']) {
      expect(rows[0]).toContain(`data-label="${label}"`)
    }
    expect(rows[0]).toContain('Record payment')
  })

  it('a cancelled invoice has no Record payment and no empty Actions caption', () => {
    expect(rows[1]).not.toContain('Record payment')
    expect(rows[1]).not.toContain('data-label="Actions"')
    expect(rows[1]).toContain('Cancelled (number kept)')
  })

  it('shows money with thousands separators and keeps numbers and dates whole', () => {
    expect(rows[0]).toContain('$1,450.00')
    expect(rows[0]).toContain('$600.00')
    expect(rows[0]).toContain('<span class="invoice-list-date">2026-10-01 –</span> <span class="invoice-list-date">2026-10-31</span>')
  })
})
