// UI state of the Action Queue "Mortgage balance review" item, as a pure reducer (testable without React).
// Load errors and action errors are separate (T3): the list refresh that follows every action reports only its own
// outcome, so it can never erase the explanation of a refused confirmation. An action error stays until the next action
// starts.
export interface ReviewUiState {
  loadError: string | null
  actionError: string | null
  busy: boolean
}

export type ReviewUiEvent =
  | { type: 'actionStarted' }
  | { type: 'actionFinished'; error: string | null }
  | { type: 'loadFinished'; error: string | null }

export const initialReviewUiState: ReviewUiState = { loadError: null, actionError: null, busy: false }

export function reviewUiReducer(state: ReviewUiState, event: ReviewUiEvent): ReviewUiState {
  switch (event.type) {
    case 'actionStarted':
      return { ...state, busy: true, actionError: null }
    case 'actionFinished':
      return { ...state, busy: false, actionError: event.error }
    case 'loadFinished':
      return { ...state, loadError: event.error }
  }
}
