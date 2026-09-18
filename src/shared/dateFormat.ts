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
