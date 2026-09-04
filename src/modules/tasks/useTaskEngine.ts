import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { listProperties } from '../properties/propertiesQueries'
import {
  createTask,
  listTasks,
  listUpcoming,
  markTaskComplete,
  updateTask,
  type RecurrenceInterval,
  type Task,
  type TaskInput,
} from './tasksQueries'

const UPCOMING_WINDOW_DAYS = 14

const BLANK_TASK: TaskInput = {
  property_id: '',
  title: '',
  notes: null,
  due_date: new Date().toISOString().slice(0, 10),
  recurrence: 'none',
}

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

export function useTaskEngine() {
  const { accountId } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [upcoming, setUpcoming] = useState<Task[]>([])
  const [propertyOptions, setPropertyOptions] = useState<{ id: string; label: string }[]>([])
  const [propertyFilter, setPropertyFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!accountId) return
    listProperties(accountId).then(({ data }) => {
      setPropertyOptions((data ?? []).map((p) => ({ id: p.id, label: p.name })))
    })
  }, [accountId])

  const refresh = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const [{ data: taskData, error: taskError }, { data: upcomingData, error: upcomingError }] =
      await Promise.all([
        listTasks(accountId, propertyFilter),
        listUpcoming(accountId, UPCOMING_WINDOW_DAYS),
      ])
    setLoading(false)

    const fetchError = taskError ?? upcomingError
    if (fetchError) {
      setError(fetchError.message)
      return
    }
    setError(null)
    setTasks(taskData ?? [])
    setUpcoming(upcomingData ?? [])
  }, [accountId, propertyFilter])

  useEffect(() => {
    refresh()
  }, [refresh])

  const selectedTask = tasks.find((t) => t.id === selectedId) ?? null
  const formInitialValues: TaskInput = selectedTask
    ? {
        property_id: selectedTask.property_id,
        title: selectedTask.title,
        notes: selectedTask.notes,
        due_date: selectedTask.due_date,
        recurrence: selectedTask.recurrence,
      }
    : { ...BLANK_TASK, property_id: propertyFilter ?? '' }

  const startCreating = () => {
    setSelectedId(null)
    setIsCreating(true)
  }

  const selectTask = (id: string) => {
    setIsCreating(false)
    setSelectedId(id)
  }

  const cancelForm = () => {
    setIsCreating(false)
    setSelectedId(null)
  }

  const save = async (input: TaskInput) => {
    if (!accountId) return
    setSaving(true)
    const { error: saveError } = selectedTask
      ? await updateTask(selectedTask.id, input)
      : await createTask(accountId, input)
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    setError(null)
    setIsCreating(false)
    setSelectedId(null)
    await refresh()
  }

  const complete = async (task: Task) => {
    if (!accountId) return
    setProcessingId(task.id)

    const { error: completeError } = await markTaskComplete(task.id)
    if (completeError) {
      setProcessingId(null)
      setError(completeError.message)
      return
    }

    if (task.recurrence !== 'none') {
      const { error: rolloverError } = await createTask(accountId, {
        property_id: task.property_id,
        title: task.title,
        notes: task.notes,
        due_date: computeNextDueDate(task.due_date, task.recurrence),
        recurrence: task.recurrence,
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

  return {
    tasks,
    upcoming,
    propertyOptions,
    propertyFilter,
    setPropertyFilter,
    loading,
    error,
    processingId,
    isFormOpen: isCreating || selectedTask !== null,
    formKey: selectedTask?.id ?? 'new',
    formInitialValues,
    saving,
    startCreating,
    selectTask,
    cancelForm,
    save,
    complete,
  }
}
