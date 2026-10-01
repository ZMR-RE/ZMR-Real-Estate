import { describe, expect, it } from 'vitest'
// Raw-text import (vite/client's built-in `*?raw` module type, no Node
// `fs` needed — this file lives under src/, whose tsconfig deliberately
// carries no Node types) of the actual migration, so these assertions
// check the real file on disk rather than a hand-copied stand-in that
// could silently drift from it.
import migrationSql from '../../../supabase/migrations/20260930200000_mortgage_loan_identity_fields.sql?raw'

// Guards the two owner-approved safety properties of this migration:
// (1) loan_number/loan_type are added nullable, with no default and no
// backfill of existing rows — Data Integrity rule, never seed/infer/guess
// a field's value; (2) the loan_type seeding insert is idempotent, safe
// to re-run against an account that already has some or all of the 8
// starting values.
describe('mortgage_loan_identity_fields migration — safety invariants', () => {
  it('adds loan_number as a nullable text column with no default', () => {
    expect(migrationSql).toMatch(/alter table mortgage_details add column loan_number text;/)
  })

  it('adds loan_type as a nullable text column with no default', () => {
    expect(migrationSql).toMatch(/alter table mortgage_details add column loan_type text;/)
  })

  it('never marks either new column not null', () => {
    expect(migrationSql.toLowerCase()).not.toMatch(/loan_number[^;]*not null/)
    expect(migrationSql.toLowerCase()).not.toMatch(/loan_type[^;]*not null/)
  })

  it('never sets a default for either new column — no inferred/guessed value', () => {
    expect(migrationSql.toLowerCase()).not.toMatch(/loan_number[^;]*default/)
    expect(migrationSql.toLowerCase()).not.toMatch(/loan_type[^;]*default/)
  })

  it('never writes to an existing mortgage_details row — zero backfill', () => {
    expect(migrationSql.toLowerCase()).not.toMatch(/update\s+mortgage_details/)
  })

  it('seeds loan_type with exactly the 8 owner-approved starting values', () => {
    for (const value of [
      'Conventional',
      'FHA',
      'VA',
      'USDA',
      'Portfolio',
      'Commercial',
      'HELOC',
      'Other',
    ]) {
      expect(migrationSql).toContain(`'${value}'`)
    }
  })

  it('seeds loan_type idempotently — on conflict do nothing, safe to re-run', () => {
    expect(migrationSql.toLowerCase()).toMatch(/on conflict \(account_id, list_name, value\) do nothing/)
  })
})
