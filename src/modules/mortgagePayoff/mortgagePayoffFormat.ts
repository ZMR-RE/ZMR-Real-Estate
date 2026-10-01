// Mortgage correction (T1, isolated branch): shared by every Mortgage-tab
// display component so "exactly two decimals, always" is enforced in one
// place instead of several separate Intl.NumberFormat configs that can
// drift apart — which is exactly how this bug happened (one component had
// maximumFractionDigits: 0, rounding to whole dollars; two others had
// maximumFractionDigits: 2 with no minimumFractionDigits, so a round
// number like $50.00 would display as "$50"). minimumFractionDigits must
// be set together with maximumFractionDigits — the formatter otherwise
// trims trailing zeros instead of padding to them.
export const mortgageCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// Mortgage correction follow-up (T1, owner-approved) — formats a currency
// INPUT's raw text to exactly two decimals once editing finishes (onBlur)
// or when an existing record is first loaded into the form, never on every
// keystroke, so typing stays uninterrupted while the field has focus.
// Blank stays blank (never coerced to "0.00" — that's a real, distinct
// zero, not the same thing); text that doesn't parse as a finite number is
// left alone for the input's own validation to flag. Loan number (free
// text) and interest rate (a percentage, not a dollar amount) never call
// this — only the four actual dollar fields do.
//
// Accepts `string | number` (not just `string`) because MortgageDetails'
// numeric fields are typed `string` but PostgREST actually serializes a
// `numeric` column as a bare JSON number — confirmed directly from the
// network response (`"original_loan_amount":200000.00`, parsed by
// JSON.parse into the number 200000, trailing zeros already gone before
// this function ever sees it). That mismatch is pre-existing and far
// wider than this form; routing around it here, not fixing it everywhere.
export function formatCurrencyInputOnBlur(raw: string | number): string {
  const text = String(raw)
  if (text.trim() === '') return text
  const parsed = Number(text)
  if (!Number.isFinite(parsed)) return text
  return parsed.toFixed(2)
}
