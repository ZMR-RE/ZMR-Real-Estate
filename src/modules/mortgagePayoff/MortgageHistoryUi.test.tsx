import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HistoryChoiceField } from './HistoryChoiceField'
import { DuplicateEntryPrompt } from './DuplicateEntryPrompt'
import { MortgagePaymentList } from './MortgagePaymentList'

describe('HistoryChoiceField', () => {
  const r = (entryDate: string, statementDate: string | null, historyOnly = false) =>
    renderToStaticMarkup(<HistoryChoiceField idPrefix="p" entryDate={entryDate} statementDate={statementDate} historyOnly={historyOnly} onChange={() => {}} />)
  it('eligible date: both choices, "Changes the balance" checked by default', () => {
    const html = r('2026-08-01', '2026-09-01')
    expect(html).toContain('Already included in my opening balance')
    expect(html).toMatch(/id="p_changes_balance"[^>]*checked=""/)
    expect(html).not.toMatch(/id="p_history_only"[^>]*checked=""/)
  })
  it('no statement date: only the reason, no choice', () => {
    const html = r('2026-08-01', null)
    expect(html).toContain('first set the statement date')
    expect(html).not.toContain('type="radio"')
  })
  it('after the statement date: nothing', () => {
    expect(r('2026-09-02', '2026-09-01')).toBe('')
  })
})

describe('DuplicateEntryPrompt', () => {
  it('shows the message with Record anyway and Cancel', () => {
    const html = renderToStaticMarkup(<DuplicateEntryPrompt message="An identical entry already exists." busy={false} onConfirm={() => {}} onDismiss={() => {}} />)
    expect(html).toContain('role="alert"')
    expect(html).toContain('Record anyway (it&#x27;s a separate payment)')
    expect(html).toContain('>Cancel<')
  })
})

describe('MortgagePaymentList with history rows', () => {
  const base = { property_id: 'p', amount: '1264.14', principal_amount: '464.14', interest_amount: '800.00', void_outcome: null }
  it('badges history rows, offers Void on active ones, and never shows a balance-reversal note for them', () => {
    const html = renderToStaticMarkup(
      <MortgagePaymentList
        payments={[
          { ...base, id: 'h1', payment_date: '2026-08-01', voided: false, history: true },
          { ...base, id: 'h2', payment_date: '2026-07-01', voided: true, history: true },
          { ...base, id: 'n1', payment_date: '2026-10-01', voided: false, history: false },
        ]}
        onVoid={() => {}}
        voiding={false}
      />,
    )
    expect(html).toContain('History · included in opening balance')
    expect(html).toContain('History only; balance not affected.')
    expect((html.match(/>Void</g) ?? []).length).toBe(2)
  })
})
