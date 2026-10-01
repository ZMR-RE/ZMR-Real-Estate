const CURRENCY = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const DATE_TIME = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

export function formatMoney(value: number): string {
  return CURRENCY.format(value)
}

export function formatRunTime(iso: string): string {
  return DATE_TIME.format(new Date(iso))
}

export function ordinalDay(day: number): string {
  const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th'
  return `${day}${suffix}`
}
