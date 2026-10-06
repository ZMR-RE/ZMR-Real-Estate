/** Decimal text stays text: no rounding, exponent notation, or cents shifting. */
export interface CurrencyRules { required?: boolean; min?: string; max?: string }
const decimal = /^-?(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/
export function formatCurrencyAmount(raw: string | number): string {
  const text = String(raw).trim()
  if (!text) return ''
  if (!decimal.test(text)) return String(raw)
  const negative = text.startsWith('-')
  const [whole, fraction = ''] = (negative ? text.slice(1) : text).split('.')
  const dollars = (whole || '0').replace(/^0+(?=\d)/, '')
  const cents = fraction.padEnd(2, '0')
  return `${negative && (dollars !== '0' || cents !== '00') ? '-' : ''}${dollars}.${cents}`
}
function cents(text: string): bigint { return BigInt(formatCurrencyAmount(text).replace('.', '')) }
export function currencyAmountError(raw: string | number | null, rules: CurrencyRules = {}): string | null {
  const text = String(raw ?? '').trim()
  if (!text) return rules.required ? 'Enter an amount in dollars.' : null
  if (!decimal.test(text)) return 'Use dollars and cents with no more than two decimal places (for example, 125.50).'
  const value = cents(text)
  if (rules.min !== undefined && value < cents(rules.min)) return `Enter at least $${formatCurrencyAmount(rules.min)}.`
  if (rules.max !== undefined && value > cents(rules.max)) return `Enter no more than $${formatCurrencyAmount(rules.max)}.`
  return null
}
