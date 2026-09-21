// Roadmap 1.18 — a currency amount field must never hold more than 2
// decimal digits, and should round/format to exactly 2 on blur. Shared
// so Quick Capture's create form and its Recently logged/Reconciliation
// detail-completion form (both editing the same capture_log.amount
// column) stay in lockstep rather than each re-implementing this.

// Truncates (not rejects outright) anything past 2 decimal digits as the
// user types/pastes, so the field can never end up holding a 3rd decimal
// digit in the first place — e.g. "12.999" -> "12.99". Left mid-typing
// states ("", "12", "12.") pass through untouched.
export function sanitizeAmountInput(value: string): string {
  const match = value.match(/^\d*(\.\d{0,2})?/)
  return match ? match[0] : ''
}

// Submit-time guard alongside sanitizeAmountInput's real-time truncation
// — belt and suspenders against an amount reaching a save call with more
// than 2 decimal digits (e.g. a paste event that bypasses onChange).
export function hasAtMostTwoDecimalPlaces(value: string): boolean {
  return /^\d*(\.\d{0,2})?$/.test(value.trim())
}

// Rounds/pads a finished amount to exactly 2 decimal places for display
// on blur — "12.5" -> "12.50", "12" -> "12.00". Leaves an empty or
// unparseable value alone; validating "is this a real positive number"
// is a submit-time concern handled elsewhere, not this formatter's job.
export function formatAmountOnBlur(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  const parsed = Number(trimmed)
  if (Number.isNaN(parsed)) return trimmed
  return parsed.toFixed(2)
}
