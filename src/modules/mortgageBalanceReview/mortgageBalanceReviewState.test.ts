import { describe, expect, it } from 'vitest'
import { initialReviewUiState, reviewUiReducer, type ReviewUiEvent } from './mortgageBalanceReviewState'
import { STALE_BALANCE_REVIEW_MESSAGE } from '../mortgagePayoff/mortgageBalanceIntegrity'

const run = (events: ReviewUiEvent[]) => events.reduce(reviewUiReducer, initialReviewUiState)

describe('Action Queue review: action errors survive the refresh (T3)', () => {
  it('a refused confirmation followed by a successful refresh keeps the explanation', () => {
    const s = run([
      { type: 'loadFinished', error: null },
      { type: 'actionStarted' },
      { type: 'actionFinished', error: STALE_BALANCE_REVIEW_MESSAGE },
      { type: 'loadFinished', error: null }, // the refresh every action triggers
    ])
    expect(s).toEqual({ loadError: null, actionError: STALE_BALANCE_REVIEW_MESSAGE, busy: false })
  })

  it('the next action clears the previous explanation as it starts', () => {
    const s = run([
      { type: 'actionStarted' },
      { type: 'actionFinished', error: STALE_BALANCE_REVIEW_MESSAGE },
      { type: 'loadFinished', error: null },
      { type: 'actionStarted' },
    ])
    expect(s.actionError).toBeNull()
    expect(s.busy).toBe(true)
  })

  it('a successful action leaves no action error; a later successful refresh changes nothing', () => {
    const s = run([{ type: 'actionStarted' }, { type: 'actionFinished', error: null }, { type: 'loadFinished', error: null }])
    expect(s).toEqual(initialReviewUiState)
  })

  it('a failed refresh is a load error and does not overwrite or clear the action error', () => {
    const s = run([
      { type: 'actionStarted' },
      { type: 'actionFinished', error: 'Changed at the same time somewhere else, so nothing was saved. Try again.' },
      { type: 'loadFinished', error: "Couldn't load mortgage balance reviews: network" },
    ])
    expect(s.actionError).toBe('Changed at the same time somewhere else, so nothing was saved. Try again.')
    expect(s.loadError).toBe("Couldn't load mortgage balance reviews: network")
    const recovered = reviewUiReducer(s, { type: 'loadFinished', error: null })
    expect(recovered.loadError).toBeNull()
    expect(recovered.actionError).toBe(s.actionError)
  })
})
