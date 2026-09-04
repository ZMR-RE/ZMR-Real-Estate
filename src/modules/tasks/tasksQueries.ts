import { supabase } from '../../shared/supabaseClient'

export type RecurrenceInterval = 'none' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface Task {
  id: string
  account_id: string
  property_id: string
  title: string
  notes: string | null
  due_date: string
  recurrence: RecurrenceInterval
  completed: boolean
  completed_at: string | null
  property: { id: string; name: string } | null
}

export type TaskInput = {
  property_id: string
  title: string
  notes: string | null
  due_date: string
  recurrence: RecurrenceInterval
}

const TASK_COLUMNS =
  'id, account_id, property_id, title, notes, due_date, recurrence, completed, completed_at, property:properties(id, name)'

export async function listTasks(accountId: string, propertyId: string | null) {
  let query = supabase
    .from('tasks')
    .select(TASK_COLUMNS)
    .eq('account_id', accountId)
    .order('due_date', { ascending: true })

  if (propertyId) {
    query = query.eq('property_id', propertyId)
  }

  return query.returns<Task[]>()
}

export async function listUpcoming(accountId: string, withinDays: number) {
  const today = new Date()
  const horizon = new Date(today)
  horizon.setDate(horizon.getDate() + withinDays)

  return supabase
    .from('tasks')
    .select(TASK_COLUMNS)
    .eq('account_id', accountId)
    .eq('completed', false)
    .lte('due_date', horizon.toISOString().slice(0, 10))
    .order('due_date', { ascending: true })
    .returns<Task[]>()
}

export async function createTask(accountId: string, input: TaskInput) {
  return supabase
    .from('tasks')
    .insert({ ...input, account_id: accountId })
    .select(TASK_COLUMNS)
    .single()
}

export async function updateTask(id: string, input: TaskInput) {
  return supabase.from('tasks').update(input).eq('id', id).select(TASK_COLUMNS).single()
}

export async function markTaskComplete(id: string) {
  return supabase
    .from('tasks')
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq('id', id)
    .select(TASK_COLUMNS)
    .single()
}
