import { describe, expect, it } from 'vitest'
import {
  interpretOwnershipError,
  validateOwnershipEntriesClientSide,
  type OwnershipEntryInput,
} from './ownershipInterestsQueries'

// These mirror, on the client side, the exact rules enforced server-side
// by _validate_ownership_entries() in
// supabase/migrations/20260925060000_ownership_interest_functions.sql —
// both were verified directly against a scratch Postgres instance (see
// the implementation contract's verification section). This test file
// only exercises the pure TypeScript mirror; it makes no network call and
// touches no database, live or otherwise.

describe('validateOwnershipEntriesClientSide', () => {
  // Regression coverage for the checkpoint finding: an earlier version of
  // both this function and its server-side counterpart inferred
  // "complete" merely from "every entered owner has a known percentage,"
  // which wrongly rejected (or would have mislabeled) exactly this case —
  // one owner entered at 48%, with the rest of the ownership not yet on
  // file. Marked 'incomplete', this must be accepted; it must NOT be
  // silently treated as a finished 100% allocation, and it must NOT be
  // rejected just because 48 != 100.
  it('accepts a single owner at 48% marked incomplete (more owners not yet entered)', () => {
    const entries: OwnershipEntryInput[] = [{ ownerId: 'a', percentage: 48 }]
    expect(validateOwnershipEntriesClientSide(entries, 'incomplete')).toEqual({ valid: true })
  })

  // The same 48%-only set marked 'complete' must be rejected — this is
  // the corrected behavior: completeness is an explicit assertion the
  // server (and this mirror) actually enforces, not a label attached
  // after the fact to whatever was entered.
  it('rejects a single owner at 48% marked complete', () => {
    const entries: OwnershipEntryInput[] = [{ ownerId: 'a', percentage: 48 }]
    const result = validateOwnershipEntriesClientSide(entries, 'complete')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/must total exactly 100/)
  })

  it('accepts a single owner at 100% marked complete', () => {
    const entries: OwnershipEntryInput[] = [{ ownerId: 'a', percentage: 100 }]
    expect(validateOwnershipEntriesClientSide(entries, 'complete')).toEqual({ valid: true })
  })

  it('accepts a fully-known allocation summing to exactly 100, marked complete', () => {
    const entries: OwnershipEntryInput[] = [
      { ownerId: 'a', percentage: 48 },
      { ownerId: 'b', percentage: 52 },
    ]
    expect(validateOwnershipEntriesClientSide(entries, 'complete')).toEqual({ valid: true })
  })

  it('accepts the identical 48/52 set marked incomplete too — completeness is a separate assertion, not derived from the sum', () => {
    const entries: OwnershipEntryInput[] = [
      { ownerId: 'a', percentage: 48 },
      { ownerId: 'b', percentage: 52 },
    ]
    expect(validateOwnershipEntriesClientSide(entries, 'incomplete')).toEqual({ valid: true })
  })

  it('rejects marking complete when any owner has an unknown percentage', () => {
    const entries: OwnershipEntryInput[] = [
      { ownerId: 'a', percentage: 40 },
      { ownerId: 'b', percentage: null },
    ]
    const result = validateOwnershipEntriesClientSide(entries, 'complete')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/unknown percentage/)
  })

  it('accepts a partial allocation with one owner unknown, marked incomplete', () => {
    const entries: OwnershipEntryInput[] = [
      { ownerId: 'a', percentage: 40 },
      { ownerId: 'b', percentage: null },
    ]
    expect(validateOwnershipEntriesClientSide(entries, 'incomplete')).toEqual({ valid: true })
  })

  it('accepts every owner unknown, marked incomplete', () => {
    const entries: OwnershipEntryInput[] = [
      { ownerId: 'a', percentage: null },
      { ownerId: 'b', percentage: null },
    ]
    expect(validateOwnershipEntriesClientSide(entries, 'incomplete')).toEqual({ valid: true })
  })

  it('rejects marking an empty set complete (no owners at all)', () => {
    const result = validateOwnershipEntriesClientSide([], 'complete')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/at least one owner/)
  })

  it('accepts an empty set marked incomplete (the unresolved state)', () => {
    expect(validateOwnershipEntriesClientSide([], 'incomplete')).toEqual({ valid: true })
  })

  it('rejects known percentages summing to more than 100, regardless of completeness', () => {
    const entries: OwnershipEntryInput[] = [
      { ownerId: 'a', percentage: 60 },
      { ownerId: 'b', percentage: 60 },
    ]
    expect(validateOwnershipEntriesClientSide(entries, 'incomplete').valid).toBe(false)
    expect(validateOwnershipEntriesClientSide(entries, 'complete').valid).toBe(false)
  })

  it('rejects a zero or negative percentage', () => {
    expect(validateOwnershipEntriesClientSide([{ ownerId: 'a', percentage: 0 }], 'incomplete').valid).toBe(false)
    expect(validateOwnershipEntriesClientSide([{ ownerId: 'a', percentage: -5 }], 'incomplete').valid).toBe(false)
  })

  it('rejects a percentage above 100', () => {
    const result = validateOwnershipEntriesClientSide([{ ownerId: 'a', percentage: 101 }], 'incomplete')
    expect(result.valid).toBe(false)
  })

  it('rejects the same owner appearing twice in one set', () => {
    const entries: OwnershipEntryInput[] = [
      { ownerId: 'a', percentage: 50 },
      { ownerId: 'a', percentage: 50 },
    ]
    const result = validateOwnershipEntriesClientSide(entries, 'incomplete')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/only once/)
  })

  it('handles the 48/52 -> 50/50 rebalance shape as a single valid complete set', () => {
    // The atomicity guarantee lives in the server-side function (one
    // transaction, one call) — this just confirms the client never has a
    // reason to reject the target state the RPC call would send.
    const rebalanced: OwnershipEntryInput[] = [
      { ownerId: 'a', percentage: 50 },
      { ownerId: 'b', percentage: 50 },
    ]
    expect(validateOwnershipEntriesClientSide(rebalanced, 'complete')).toEqual({ valid: true })
  })
})

describe('interpretOwnershipError', () => {
  it('maps ZM001 to a stale-write category', () => {
    expect(interpretOwnershipError({ code: 'ZM001', message: 'Ownership data has changed since you loaded it.' })).toEqual({
      kind: 'stale',
      message: 'Ownership data has changed since you loaded it.',
    })
  })

  it('maps ZM002 to an authorization category', () => {
    expect(interpretOwnershipError({ code: 'ZM002', message: 'Not authorized for this account.' }).kind).toBe('authorization')
  })

  it('maps ZM003 to a validation category', () => {
    expect(interpretOwnershipError({ code: 'ZM003', message: 'Percentage must be greater than 0.' }).kind).toBe('validation')
  })

  it('maps ZM004 to a not-found category', () => {
    expect(interpretOwnershipError({ code: 'ZM004', message: 'Property not found.' }).kind).toBe('not_found')
  })

  it('falls back to unknown for an unrecognized or missing error code', () => {
    expect(interpretOwnershipError({ code: '23505', message: 'duplicate key' }).kind).toBe('unknown')
    expect(interpretOwnershipError(null).kind).toBe('unknown')
  })
})
