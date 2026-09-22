import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { propertyLabel } from '../../shared/propertyLabel'
import { listProperties } from '../properties/propertiesQueries'
import { listAccountMemberDirectory } from '../auditLog/auditLogQueries'
import { actionItemPriority } from './actionItemPriority'
import { useActionQueueFilters } from './useActionQueueFilters'
import {
  createActionItem,
  listActionItems,
  setActionItemCompleted,
  updateActionItem,
  type ActionItem,
  type ActionItemInput,
  type RecurrenceInterval,
} from './actionItemsQueries'

function todayDateString() {
  return new Date().toISOString().slice(0, 10)
}

const BLANK_ACTION_ITEM: ActionItemInput = {
  propertyId: null,
  unitId: null,
  type: null,
  title: '',
  notes: null,
  assignee: null,
  dueDate: todayDateString(),
  recurrence: 'none',
  customIntervalDays: null,
}

// Same recurrence rollover math Tasks (2.2) used before its rows were
// migrated in and the module retired — kept for the same reason it
// existed there: computing the next occurrence's due date on completion.
// Roadmap 10.5 added 'custom' (a plain "every N days" cadence).
function computeNextDueDate(dueDate: string, recurrence: RecurrenceInterval, customIntervalDays: number | null): string {
  const next = new Date(`${dueDate}T00:00:00`)
  switch (recurrence) {
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + 1)
      break
    case 'quarterly':
      next.setMonth(next.getMonth() + 3)
      break
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1)
      break
    case 'custom':
      next.setDate(next.getDate() + (customIntervalDays ?? 0))
      break
    case 'none':
      return dueDate
  }
  return next.toISOString().slice(0, 10)
}

// Portfolio-wide Action Queue (roadmap 10.2, overhauled by 10.5).
// propertyId is optional so the same hook also backs the per-property
// Follow-ups card on the KPI tab (roadmap 7.13) — one query path, no
// duplicated fetch logic between the two surfaces that read this table.
// `groups` and `complete` keep their exact 10.2 shape for that caller
// (FollowUpsCard); everything from useActionQueueFilters is 10.5's new
// flat-list/filter/summary surface for the main board.
export function useActionQueue(propertyId?: string) {
  const { accountId } = useAuth()
  const [items, setItems] = useState<ActionItem[]>([])
  const [propertyOptions, setPropertyOptions] = useState<{ id: string; label: string }[]>([])
  const [propertyFilter, setPropertyFilter] = useState<string | null>(null)
  const [memberOptions, setMemberOptions] = useState<{ id: string; label: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  // 10.5 — click-through detail (view, then an explicit Edit action
  // inside it, per the Box interaction standard).
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  const scopedToProperty = propertyId !== undefined

  useEffect(() => {
    if (!accountId || scopedToProperty) return
    listProperties(accountId).then(({ data }) => {
      setPropertyOptions((data ?? []).map((p) => ({ id: p.id, label: propertyLabel(p) })))
    })
  }, [accountId, scopedToProperty])

  useEffect(() => {
    if (!accountId) return
    listAccountMemberDirectory(accountId).then(({ data }) => {
      setMemberOptions((data ?? []).map((m) => ({ id: m.user_id, label: m.email })))
    })
  }, [accountId])

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const { data, error: fetchError } = await listActionItems(accountId, {
      propertyId: scopedToProperty ? propertyId! : propertyFilter,
    })
    setLoading(false)

    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setItems(data ?? [])
  }, [accountId, scopedToProperty, propertyId, propertyFilter])

  useEffect(() => {
    refresh()
  }, [refresh])

  const startCreating = () => {
    setError(null)
    setIsCreating(true)
  }

  const cancelForm = () => setIsCreating(false)

  const save = async (input: ActionItemInput) => {
    if (!accountId) return
    setSaving(true)
    const { error: saveError } = await createActionItem(accountId, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    setIsCreating(false)
    await refresh()
  }

  const saveEdit = async (id: string, input: ActionItemInput) => {
    setSaving(true)
    const { error: saveError } = await updateActionItem(id, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }
    setError(null)
    await refresh()
  }

  const toggleCompleted = async (item: ActionItem, completed: boolean) => {
    if (!accountId) return
    setProcessingId(item.id)

    const { error: toggleError } = await setActionItemCompleted(item.id, completed)
    if (toggleError) {
      setProcessingId(null)
      setError(toggleError.message)
      return
    }

    if (completed && item.recurrence !== 'none') {
      const { error: rolloverError } = await createActionItem(accountId, {
        propertyId: item.property_id,
        unitId: item.unit_id,
        type: item.type,
        title: item.title,
        notes: item.notes,
        assignee: item.assignee,
        dueDate: computeNextDueDate(item.due_date, item.recurrence, item.custom_interval_days),
        recurrence: item.recurrence,
        customIntervalDays: item.custom_interval_days,
      })
      if (rolloverError) {
        setProcessingId(null)
        setError(rolloverError.message)
        return
      }
    }

    setProcessingId(null)
    setError(null)
    await refresh()
  }

  // Kept as its own name/shape — FollowUpsCard (KPI tab) calls this
  // exactly as roadmap 10.2 built it.
  const complete = (item: ActionItem) => toggleCompleted(item, true)
  const reopen = (item: ActionItem) => toggleCompleted(item, false)

  const openItems = items.filter((i) => !i.completed)

  const groupedByType = new Map<string, ActionItem[]>()
  for (const item of openItems) {
    const key = item.type ?? 'Uncategorized'
    const group = groupedByType.get(key)
    if (group) {
      group.push(item)
    } else {
      groupedByType.set(key, [item])
    }
  }
  const groups = Array.from(groupedByType.entries()).sort(([a], [b]) => a.localeCompare(b))

  const filters = useActionQueueFilters(items)

  const selectedItem = selectedItemId ? (items.find((i) => i.id === selectedItemId) ?? null) : null

  return {
    // 10.2 shape, unchanged — FollowUpsCard's contract.
    groups,
    propertyOptions,
    propertyFilter,
    setPropertyFilter,
    memberOptions,
    loading,
    error,
    processingId,
    isCreating,
    saving,
    formInitialValues: scopedToProperty ? { ...BLANK_ACTION_ITEM, propertyId: propertyId! } : BLANK_ACTION_ITEM,
    startCreating,
    cancelForm,
    save,
    complete,

    // 10.5 additions.
    items,
    ...filters,
    selectedItemId,
    setSelectedItemId,
    selectedItem,
    saveEdit,
    reopen,
    refresh,
    priorityOf: actionItemPriority,
  }
}
