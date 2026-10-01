import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// The form's loan-type picker reads pick lists through the shared client and auth; neither runs during a static
// render, but both modules must load without env vars.
vi.mock('../../shared/supabaseClient', () => ({ supabase: {} }))
vi.mock('../../shared/auth/AuthContext', () => ({ useAuth: () => ({ accountId: 'acct' }) }))

const { MortgageDetailsForm } = await import('./MortgageDetailsForm')
const { MortgagePropertySummary } = await import('./MortgagePropertySummary')
import type { MortgageDetails } from './mortgagePayoffQueries'

// B-1: a refused save or void is shown inside the form/summary the user acted on, which stays rendered.
const loan: MortgageDetails = {
  id: 'loan-1', property_id: 'prop-1', lender_name: 'ZMR-TEST Bank', original_loan_amount: '200000.00',
  current_balance: '149000.00', interest_rate: '6.5', monthly_payment: '1264.14', loan_start_date: '2020-01-01',
  term_years: 30, escrow_balance: '1000.00', loan_number: null, loan_type: null, principal_version: 6, escrow_version: 3,
}
const refusal = "A statement date can't be in the future. Nothing was saved; your entries are still in the form."

describe('MortgageDetailsForm with a refused save', () => {
  const html = renderToStaticMarkup(
    <MortgageDetailsForm initialValues={loan} saving={false} error={refusal} canCancel onSave={() => {}} onCancel={() => {}} />,
  )

  it('shows the refusal as an alert inside the form, just before Save', () => {
    const alert = html.indexOf(`<p role="alert">${refusal.replace("'", '&#x27;')}</p>`)
    expect(alert).toBeGreaterThan(html.indexOf('<form'))
    expect(alert).toBeLessThan(html.indexOf('Save mortgage details'))
  })

  it('keeps the form and its values on screen (Save and Cancel still offered)', () => {
    expect(html).toContain('value="149000.00"')
    expect(html).toContain('value="1000.00"')
    expect(html).toContain('value="ZMR-TEST Bank"')
    expect(html).toContain('Cancel')
  })

  it('shows no alert when there is no error', () => {
    const clean = renderToStaticMarkup(
      <MortgageDetailsForm initialValues={loan} saving={false} error={null} canCancel onSave={() => {}} onCancel={() => {}} />,
    )
    expect(clean).not.toContain('role="alert"')
  })
})

describe('MortgagePropertySummary with a refused void', () => {
  it('keeps the summary and shows the message beside its actions', () => {
    const html = renderToStaticMarkup(
      <MortgagePropertySummary mortgageDetails={loan} marketValue={null} equity={null} onEdit={() => {}} onVoid={() => {}}
        voiding={false} error="Changed at the same time somewhere else, so nothing was saved. Try again. The mortgage was not voided." />,
    )
    expect(html).toContain('$149,000.00')
    const alert = html.indexOf('<p role="alert">Changed at the same time')
    expect(alert).toBeGreaterThan(-1)
    expect(alert).toBeLessThan(html.indexOf('Void mortgage'))
  })
})
