import type { CaptureEntry } from './captureQueries'

// Roadmap 1.11 — "Complete" is a quality/completeness signal, not a
// save gate (1.7 already lets a bare type+property+date row save). Each
// type's bar for "someone could act on this without going back for
// more" is different, so this is the one place that decides it:
//   - Receipt: needs at least one attachment (proof of the expense)
//   - Visit / Communication: needs notes (what happened)
//   - Mileage: needs a positive miles-driven value
// manually_completed always wins regardless of the above, since that's
// the explicit human override roadmap 1.11 calls for. A reconciled entry
// is likewise always Complete: it already passed this exact check to
// get reconciled (1.11 requires that), and reconciling a receipt moves
// its attachments out to Documents — deleting their capture_attachments
// rows so "Recently logged" doesn't offer a broken "View" link — which
// would otherwise make the completeness check re-evaluate on a now-
// attachment-less row and flip a settled entry back to "Needs details".
export function isCaptureEntryComplete(
  entry: Pick<CaptureEntry, 'entry_type' | 'notes' | 'miles_driven' | 'attachments' | 'manually_completed' | 'reconciled'>,
): boolean {
  if (entry.manually_completed || entry.reconciled) return true

  switch (entry.entry_type) {
    case 'receipt':
      return entry.attachments.length > 0
    case 'visit':
    case 'communication':
      return Boolean(entry.notes?.trim())
    case 'mileage':
      return entry.miles_driven !== null && Number(entry.miles_driven) > 0
  }
}
