import { useState } from 'react'
import { HISTORY_PAGE_SIZE, paginate } from './mortgageTabLogic'

// Page state for a compact history list. paginate() clamps, so a list that
// shrinks (e.g. "Show voided" turned off) never lands on an empty page.
export function usePagedList<T>(all: T[], size = HISTORY_PAGE_SIZE) {
  const [page, setPage] = useState(0)
  const current = paginate(all, page, size)
  return {
    ...current,
    total: all.length,
    hasPrevious: current.page > 0,
    hasNext: current.page < current.pageCount - 1,
    previous: () => setPage(current.page - 1),
    next: () => setPage(current.page + 1),
  }
}
