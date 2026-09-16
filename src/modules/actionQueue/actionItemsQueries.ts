import { supabase } from '../../shared/supabaseClient'

export type RecurrenceInterval = 'none' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface ActionItem {
  id: string
  property_id: string | null
  unit_id: string | null
  type: string | null
  title: string
  notes: string | null
  assignee: string | null
  due_date: string
  recurrence: RecurrenceInterval
  completed: boolean
  completed_at: string | null
  property: { id: string; name: string; address: string | null; status: 'active' | 'inactive' | 'sold' } | null
  unit: { id: string; unit_label: string } | null
}

export interface ActionItemInput {
  propertyId: string | null
  unitId: string | null
  type: string | null
  title: string
  notes: string | null
  assignee: string | null
  dueDate: string
  recurrence: RecurrenceInterval
}

const ACTION_ITEM_COLUMNS =
  'id, property_id, unit_id, type, title, notes, assignee, due_date, recurrence, completed, completed_at, property:properties(id, name, address, status), unit:units(id, unit_label)'

export interface ActionItemFilters {
  propertyId?: string | null
}

export async function listActionItems(accountId: string, filters: ActionItemFilters = {}) {
  let query = supabase
    .from('action_items')
    .select(ACTION_ITEM_COLUMNS)
    .eq('account_id', accountId)
    .order('due_date', { ascending: true })

  if (filters.propertyId) {
    query = query.eq('property_id', filters.propertyId)
  }

  return query.returns<ActionItem[]>()
}

export async function createActionItem(accountId: string, input: ActionItemInput) {
  return supabase
    .from('action_items')
    .insert({
      account_id: accountId,
      property_id: input.propertyId,
      unit_id: input.unitId,
      type: input.type,
      title: input.title,
      notes: input.notes,
      assignee: input.assignee,
      due_date: input.dueDate,
      recurrence: input.recurrence,
    })
    .select(ACTION_ITEM_COLUMNS)
    .single()
}

export async function markActionItemComplete(id: string) {
  return supabase
    .from('action_items')
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq('id', id)
    .select(ACTION_ITEM_COLUMNS)
    .single()
}
