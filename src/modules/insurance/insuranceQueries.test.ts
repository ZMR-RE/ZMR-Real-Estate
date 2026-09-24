import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  computeInsuranceTermStatus,
  insuranceTermUrgency,
  termCountdownPhrase,
  type InsuranceTermStatus,
} from './insuranceQueries'

function setToday(iso: string) {
  vi.setSystemTime(new Date(`${iso}T12:00:00`))
}

beforeEach(() => {
  // Fixed to a real DST-observing zone regardless of the machine/CI this
  // runs on, so the DST-boundary cases below are deterministic. Node
  // re-resolves the offset per Date construction from process.env.TZ, so
  // stubbing it before each test (via vi.stubEnv, which needs no `process`
  // type reference here — src's own tsconfig deliberately has no Node
  // types, per its DOM-only `types` list) is enough to cover every Date
  // call inside that test.
  vi.stubEnv('TZ', 'America/New_York')
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('computeInsuranceTermStatus', () => {
  it('treats both dates missing as incomplete, with null day counts', () => {
    setToday('2026-06-15')
    const status = computeInsuranceTermStatus({ coverage_start_date: null, coverage_end_date: null })
    expect(status).toEqual<InsuranceTermStatus>({
      kind: 'incomplete',
      daysUntilStart: null,
      daysUntilEnd: null,
      endsToday: false,
    })
  })

  describe('start date only (no end on file)', () => {
    it('is upcoming when the start is in the future', () => {
      setToday('2026-06-15')
      const status = computeInsuranceTermStatus({ coverage_start_date: '2026-07-01', coverage_end_date: null })
      expect(status.kind).toBe('upcoming')
      expect(status.daysUntilStart).toBe(16)
      expect(status.daysUntilEnd).toBeNull()
    })

    it('is incomplete — never "within" — when the start is today (the old Active-on-missing-data bug\'s exact shape)', () => {
      setToday('2026-06-15')
      const status = computeInsuranceTermStatus({ coverage_start_date: '2026-06-15', coverage_end_date: null })
      expect(status.kind).toBe('incomplete')
    })

    it('is incomplete when the start is in the past', () => {
      setToday('2026-06-15')
      const status = computeInsuranceTermStatus({ coverage_start_date: '2026-01-01', coverage_end_date: null })
      expect(status.kind).toBe('incomplete')
    })
  })

  describe('end date only (no start on file)', () => {
    it('is "ended" when the known end date is in the past, regardless of missing start', () => {
      setToday('2026-06-15')
      const status = computeInsuranceTermStatus({ coverage_start_date: null, coverage_end_date: '2026-01-01' })
      expect(status.kind).toBe('ended')
      expect(status.daysUntilEnd).toBe(-165)
    })

    it('is incomplete when the known end date is today (cannot confirm "within" without a start)', () => {
      setToday('2026-06-15')
      const status = computeInsuranceTermStatus({ coverage_start_date: null, coverage_end_date: '2026-06-15' })
      expect(status.kind).toBe('incomplete')
    })

    it('is incomplete when the known end date is in the future', () => {
      setToday('2026-06-15')
      const status = computeInsuranceTermStatus({ coverage_start_date: null, coverage_end_date: '2026-12-31' })
      expect(status.kind).toBe('incomplete')
    })
  })

  describe('both dates known', () => {
    it('is "within" when today is strictly between start and end', () => {
      setToday('2026-06-15')
      const status = computeInsuranceTermStatus({ coverage_start_date: '2026-01-01', coverage_end_date: '2026-12-31' })
      expect(status.kind).toBe('within')
      expect(status.endsToday).toBe(false)
    })

    it('is "within" when today equals the start date', () => {
      setToday('2026-01-01')
      const status = computeInsuranceTermStatus({ coverage_start_date: '2026-01-01', coverage_end_date: '2026-12-31' })
      expect(status.kind).toBe('within')
    })

    it('is "within" with endsToday=true, never "ended", when today equals the end date', () => {
      setToday('2026-12-31')
      const status = computeInsuranceTermStatus({ coverage_start_date: '2026-01-01', coverage_end_date: '2026-12-31' })
      expect(status.kind).toBe('within')
      expect(status.endsToday).toBe(true)
      expect(status.daysUntilEnd).toBe(0)
    })

    it('is "upcoming" when the start is in the future (valid range)', () => {
      setToday('2026-06-15')
      const status = computeInsuranceTermStatus({ coverage_start_date: '2026-07-01', coverage_end_date: '2027-07-01' })
      expect(status.kind).toBe('upcoming')
      expect(status.daysUntilStart).toBe(16)
    })

    it('is "ended" when the end date is in the past', () => {
      setToday('2026-06-15')
      const status = computeInsuranceTermStatus({ coverage_start_date: '2025-01-01', coverage_end_date: '2026-01-01' })
      expect(status.kind).toBe('ended')
      expect(status.daysUntilEnd).toBe(-165)
    })

    it('is "ended", not "within", the day immediately after the end date', () => {
      setToday('2026-01-02')
      const status = computeInsuranceTermStatus({ coverage_start_date: '2025-01-01', coverage_end_date: '2026-01-01' })
      expect(status.kind).toBe('ended')
      expect(status.daysUntilEnd).toBe(-1)
    })

    it('is "invalid_range" when the end date is before the start date, even if today would otherwise read as "within"', () => {
      setToday('2026-06-15')
      const status = computeInsuranceTermStatus({ coverage_start_date: '2026-09-01', coverage_end_date: '2026-01-01' })
      expect(status.kind).toBe('invalid_range')
    })

    it('is "invalid_range" (never "upcoming") for a reversed pair entirely in the future', () => {
      setToday('2026-01-01')
      const status = computeInsuranceTermStatus({ coverage_start_date: '2026-09-01', coverage_end_date: '2026-06-01' })
      expect(status.kind).toBe('invalid_range')
    })
  })

  describe('daylight-saving boundaries (America/New_York, spring-forward 2026-03-08, fall-back 2026-11-01)', () => {
    it('counts a clean 14 calendar days across the spring-forward transition (23-hour day)', () => {
      setToday('2026-03-01')
      const status = computeInsuranceTermStatus({ coverage_start_date: null, coverage_end_date: '2026-03-15' })
      expect(status.daysUntilEnd).toBe(14)
    })

    it('counts a clean 14 calendar days across the fall-back transition (25-hour day)', () => {
      setToday('2026-10-25')
      const status = computeInsuranceTermStatus({ coverage_start_date: null, coverage_end_date: '2026-11-08' })
      expect(status.daysUntilEnd).toBe(14)
    })
  })
})

describe('insuranceTermUrgency — 7/30-day boundaries, only for a known, still-in-force end date', () => {
  const within = (daysUntilEnd: number, endsToday = false): InsuranceTermStatus => ({
    kind: 'within',
    daysUntilStart: null,
    daysUntilEnd,
    endsToday,
  })

  it('is danger at exactly 7 days out', () => {
    expect(insuranceTermUrgency(within(7))).toBe('danger')
  })

  it('is warning at exactly 8 days out (one past the danger boundary)', () => {
    expect(insuranceTermUrgency(within(8))).toBe('warning')
  })

  it('is warning at exactly 30 days out', () => {
    expect(insuranceTermUrgency(within(30))).toBe('warning')
  })

  it('is success at exactly 31 days out (one past the warning boundary)', () => {
    expect(insuranceTermUrgency(within(31))).toBe('success')
  })

  it('is danger when the term ends today, regardless of the raw day count', () => {
    expect(insuranceTermUrgency(within(0, true))).toBe('danger')
  })

  it('is danger for an ended term', () => {
    expect(insuranceTermUrgency({ kind: 'ended', daysUntilStart: null, daysUntilEnd: -3, endsToday: false })).toBe('danger')
  })

  it('is danger for an invalid range — flagged as a problem, never a green/neutral assurance', () => {
    expect(insuranceTermUrgency({ kind: 'invalid_range', daysUntilStart: 5, daysUntilEnd: -5, endsToday: false })).toBe(
      'danger',
    )
  })

  it('is accent (not success) for an upcoming term — scheduled, not yet in force', () => {
    expect(insuranceTermUrgency({ kind: 'upcoming', daysUntilStart: 10, daysUntilEnd: null, endsToday: false })).toBe(
      'accent',
    )
  })

  it('is neutral (never success/green) for incomplete dates', () => {
    expect(insuranceTermUrgency({ kind: 'incomplete', daysUntilStart: null, daysUntilEnd: null, endsToday: false })).toBe(
      'neutral',
    )
  })
})

// Review cleanup item 2 — "verify labels and countdown use the same
// calendar basis": termCountdownPhrase (InsuranceLedgerList.tsx) never
// recomputes "today" itself — it only formats the day counts
// computeInsuranceTermStatus already produced, so the two can never
// disagree. These cases exercise that pairing directly, including the
// boundaries above.
describe('termCountdownPhrase — reads the same status the badge label does', () => {
  it('phrases a "within" term\'s remaining days, singular at exactly 1', () => {
    expect(termCountdownPhrase({ kind: 'within', daysUntilStart: null, daysUntilEnd: 1, endsToday: false })).toBe(
      'expires in 1 day',
    )
    expect(termCountdownPhrase({ kind: 'within', daysUntilStart: null, daysUntilEnd: 7, endsToday: false })).toBe(
      'expires in 7 days',
    )
  })

  it('phrases "within" + endsToday as "term ends today", never "expires in 0 days"', () => {
    expect(termCountdownPhrase({ kind: 'within', daysUntilStart: null, daysUntilEnd: 0, endsToday: true })).toBe(
      'term ends today',
    )
  })

  it('phrases "ended" as days-ago, singular at exactly 1', () => {
    expect(termCountdownPhrase({ kind: 'ended', daysUntilStart: null, daysUntilEnd: -1, endsToday: false })).toBe(
      'ended 1 day ago',
    )
    expect(termCountdownPhrase({ kind: 'ended', daysUntilStart: null, daysUntilEnd: -165, endsToday: false })).toBe(
      'ended 165 days ago',
    )
  })

  it('phrases "upcoming" as days-until-start', () => {
    expect(termCountdownPhrase({ kind: 'upcoming', daysUntilStart: 16, daysUntilEnd: null, endsToday: false })).toBe(
      'starts in 16 days',
    )
  })

  it('phrases "invalid_range" as a plain description of the problem, not a day count', () => {
    expect(termCountdownPhrase({ kind: 'invalid_range', daysUntilStart: 5, daysUntilEnd: -5, endsToday: false })).toBe(
      'expiration date is before the effective date',
    )
  })

  it('has no countdown for incomplete dates — nothing to honestly count down to', () => {
    expect(termCountdownPhrase({ kind: 'incomplete', daysUntilStart: null, daysUntilEnd: null, endsToday: false })).toBeNull()
  })

  it('matches computeInsuranceTermStatus end-to-end across the DST boundary cases', () => {
    setToday('2026-03-01')
    const status = computeInsuranceTermStatus({ coverage_start_date: null, coverage_end_date: '2026-03-15' })
    // end-only + future => 'incomplete' per computeInsuranceTermStatus's
    // own rule, so there is deliberately no countdown here either — the
    // point of this case is that the two functions never disagree.
    expect(status.kind).toBe('incomplete')
    expect(termCountdownPhrase(status)).toBeNull()
  })
})
