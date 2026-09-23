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
  it('accepts a single owner at 100%', () => {
    const entries: OwnershipEntryInput[] = [{ ownerId: 'a', percentage: 100 }]
    expect(validateOwnershipEntriesClientSide(entries)).toEqual({ valid: true })
  })

  it('accepts a fully-known allocation that sums to exactly 100', () => {
    const entries: OwnershipEntryInput[] = [
      { ownerId: 'a', percentage: 48 },
      { ownerId: 'b', percentage: 52 },
    ]
    expect(validateOwnershipEntriesClientSide(entries)).toEqual({ valid: true })
  })

  it('accepts a partial allocation with one owner unknown (never inferring a remainder)', () => {
    const entries: OwnershipEntryInput[] = [
      { ownerId: 'a', percentage: 40 },
      { ownerId: 'b', percentage: null },
    ]
    expect(validateOwnershipEntriesClientSide(entries)).toEqual({ valid: true })
  })

  it('accepts every owner unknown (no owners have a percentage at all)', () => {
    const entries: OwnershipEntryInput[] = [
      { ownerId: 'a', percentage: null },
      { ownerId: 'b', percentage: null },
    ]
    expect(validateOwnershipEntriesClientSide(entries)).toEqual({ valid: true })
  })

  it('accepts an empty set (no current owners — the unresolved state)', () => {
    expect(validateOwnershipEntriesClientSide([])).toEqual({ valid: true })
  })

  it('rejects known percentages summing to more than 100', () => {
    const entries: OwnershipEntryInput[] = [
      { ownerId: 'a', percentage: 60 },
      { ownerId: 'b', percentage: 60 },
    ]
    const result = validateOwnershipEntriesClientSide(entries)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/cannot exceed 100/)
  })

  it('rejects a fully-known allocation that does not sum to exactly 100 (no inferred remainder)', () => {
    const entries: OwnershipEntryInput[] = [{ ownerId: 'a', percentage: 90 }]
    const result = validateOwnershipEntriesClientSide(entries)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/must total exactly 100/)
  })

  it('rejects a zero or negative percentage', () => {
    expect(validateOwnershipEntriesClientSide([{ ownerId: 'a', percentage: 0 }]).valid).toBe(false)
    expect(validateOwnershipEntriesClientSide([{ ownerId: 'a', percentage: -5 }]).valid).toBe(false)
  })

  it('rejects a percentage above 100', () => {
    const result = validateOwnershipEntriesClientSide([{ ownerId: 'a', percentage: 101 }])
    expect(result.valid).toBe(false)
  })

  it('rejects the same owner appearing twice in one set', () => {
    const entries: OwnershipEntryInput[] = [
      { ownerId: 'a', percentage: 50 },
      { ownerId: 'a', percentage: 50 },
    ]
    const result = validateOwnershipEntriesClientSide(entries)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/only once/)
  })

  it('handles the 48/52 -> 50/50 rebalance shape as a single valid set', () => {
    // The atomicity guarantee lives in the server-side function (one
    // transaction, one call) — this just confirms the client never has a
    // reason to reject the target state the RPC call would send.
    const rebalanced: OwnershipEntryInput[] = [
      { ownerId: 'a', percentage: 50 },
      { ownerId: 'b', percentage: 50 },
    ]
    expect(validateOwnershipEntriesClientSide(rebalanced)).toEqual({ valid: true })
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
