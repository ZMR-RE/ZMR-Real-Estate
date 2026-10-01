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
