import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { propertyLabel } from '../../shared/propertyLabel'
import { listProperties } from '../properties/propertiesQueries'
import { listAccountMemberDirectory } from '../auditLog/auditLogQueries'
import {
  createActionItem,
  listActionItems,
  markActionItemComplete,
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
}

// Same recurrence rollover math Tasks (2.2) used before its rows were
// migrated in and the module retired — kept for the same reason it
// existed there: computing the next occurrence's due date on completion.
function computeNextDueDate(dueDate: string, recurrence: RecurrenceInterval): string {
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
    case 'none':
      return dueDate
  }
  return next.toISOString().slice(0, 10)
}

// Portfolio-wide Action Queue (roadmap 10.2). propertyId is optional so
// the same hook also backs the per-property Follow-ups card on the KPI
// tab (roadmap 7.13) — one query path, no duplicated fetch logic between
// the two surfaces that read this table.
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

  const complete = async (item: ActionItem) => {
    if (!accountId) return
    setProcessingId(item.id)

    const { error: completeError } = await markActionItemComplete(item.id)
    if (completeError) {
      setProcessingId(null)
      setError(completeError.message)
      return
    }

    if (item.recurrence !== 'none') {
      const { error: rolloverError } = await createActionItem(accountId, {
        propertyId: item.property_id,
        unitId: item.unit_id,
        type: item.type,
        title: item.title,
        notes: item.notes,
        assignee: item.assignee,
        dueDate: computeNextDueDate(item.due_date, item.recurrence),
        recurrence: item.recurrence,
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

  return {
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
  }
}
