import { useMemo, useState } from 'react'
import { usePickListOptions } from '../../shared/pickLists/usePickListOptions'
import type { ActionItem } from './actionItemsQueries'

export type StatusFilter = 'open' | 'completed' | 'all'
export type DueDateSort = 'asc' | 'desc'

// Roadmap 10.5 — the flat list's filter/sort state and derived summary
// counts, split out of useActionQueue.ts (per CLAUDE.md's file-size
// discipline) since it's a genuinely separate concern from that hook's
// fetch/CRUD responsibilities: this only ever operates on an already-
// fetched `items` array, client-side, same pattern as every other
// filtered list in this app (Quick Capture History, Property Specs).
export function useActionQueueFilters(items: ActionItem[]) {
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open')
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [dueDateSort, setDueDateSort] = useState<DueDateSort>('asc')
  const { activeOptions: typeOptions } = usePickListOptions('task_type')

  const openItems = items.filter((i) => !i.completed)

  // Top summary strip counts — always computed over every open item,
  // ignoring the filter row, same "at a glance" convention as a
  // dashboard stat row rather than a count of the filtered list below.
  const summary = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const soon = new Date(today)
    soon.setDate(soon.getDate() + 7)

    let overdue = 0
    let dueThisWeek = 0
    let upcoming = 0
    for (const item of openItems) {
      const due = new Date(`${item.due_date}T00:00:00`)
      if (due < today) overdue++
      else if (due <= soon) dueThisWeek++
      else upcoming++
    }
    return { overdue, dueThisWeek, upcoming, automated: 0 }
  }, [openItems])

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const filtered = items.filter((item) => {
      if (statusFilter === 'open' && item.completed) return false
      if (statusFilter === 'completed' && !item.completed) return false
      if (typeFilter && item.type !== typeFilter) return false
      if (assigneeFilter && item.assignee !== assigneeFilter) return false
      if (query) {
        const haystack = `${item.title} ${item.notes ?? ''}`.toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
    return filtered.sort((a, b) => {
      const cmp = a.due_date.localeCompare(b.due_date)
      return dueDateSort === 'asc' ? cmp : -cmp
    })
  }, [items, statusFilter, typeFilter, assigneeFilter, searchQuery, dueDateSort])

  return {
    typeOptions,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    assigneeFilter,
    setAssigneeFilter,
    searchQuery,
    setSearchQuery,
    dueDateSort,
    setDueDateSort,
    summary,
    filteredItems,
  }
}
