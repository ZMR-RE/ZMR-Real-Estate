const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

// A plain date column (no time component) parsed with `new Date()` gets
// read as UTC midnight, which `toLocaleDateString()` can then roll back
// a day in any timezone behind UTC — so this reformats the "YYYY-MM-DD"
// string directly instead of going through a Date object.
export function formatDateOnly(value: string): string {
  const [year, month, day] = value.split('-')
  return `${MONTH_NAMES[Number(month) - 1]} ${Number(day)}, ${year}`
}

// The same date with a three-letter month ("Oct 15, 2026"), for table cells:
// table cells don't wrap, and on desktop a table has no sideways scroll (see
// .table-scroll), so a narrow card's table needs the shorter form to fit.
export function formatDateOnlyShort(value: string): string {
  const [year, month, day] = value.split('-')
  return `${MONTH_NAMES[Number(month) - 1].slice(0, 3)} ${Number(day)}, ${year}`
}

// Today's date on the viewer's own calendar, as "YYYY-MM-DD". Not
// `new Date().toISOString().slice(0, 10)`, which is today in UTC — in
// US evenings that is already tomorrow.
export function todayLocalIsoDate(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
