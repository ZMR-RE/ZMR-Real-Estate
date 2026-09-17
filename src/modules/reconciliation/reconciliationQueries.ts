import { listCaptureEntries, type CaptureEntry } from '../capture/captureQueries'

export type QueueEntry = CaptureEntry

// Roadmap 1.10 — delegates to captureQueries.ts's shared listCaptureEntries
// rather than hand-rolling its own select against capture_log; this is
// the one place that decides "unreconciled" means reconciled: false.
export async function listUnreconciled(accountId: string, propertyId: string | null) {
  return listCaptureEntries(accountId, { propertyId, reconciled: false })
}
