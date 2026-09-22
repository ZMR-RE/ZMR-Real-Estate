import { supabase } from '../../shared/supabaseClient'

export type RecurrenceInterval = 'none' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'

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
  custom_interval_days: number | null
  source_label: string | null
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
  customIntervalDays: number | null
}

const ACTION_ITEM_COLUMNS =
  'id, property_id, unit_id, type, title, notes, assignee, due_date, recurrence, custom_interval_days, source_label, completed, completed_at, property:properties(id, name, address, status), unit:units(id, unit_label)'

export interface ActionItemFilters {
  propertyId?: string | null
}

// Roadmap 10.5 — every item for the account comes back in one call;
// Property/Type/Status/Assignee/search filtering (and due-date sorting)
// happens client-side, same pattern as every other filtered list in this
// app (Quick Capture History, Property Specs). propertyId stays a
// server-side filter (not folded into the client-side set) since it's
// also how the per-property KPI tab's Follow-ups card scopes its own
// fetch — narrowing at the query, not after, for that caller.
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
      custom_interval_days: input.recurrence === 'custom' ? input.customIntervalDays : null,
    })
    .select(ACTION_ITEM_COLUMNS)
    .single()
}

export async function updateActionItem(id: string, input: ActionItemInput) {
  return supabase
    .from('action_items')
    .update({
      property_id: input.propertyId,
      unit_id: input.unitId,
      type: input.type,
      title: input.title,
      notes: input.notes,
      assignee: input.assignee,
      due_date: input.dueDate,
      recurrence: input.recurrence,
      custom_interval_days: input.recurrence === 'custom' ? input.customIntervalDays : null,
    })
    .eq('id', id)
    .select(ACTION_ITEM_COLUMNS)
    .single()
}

// Roadmap 10.5 — a two-way toggle (was markActionItemComplete, one-way
// only) so the detail view can also reopen an item completed by
// mistake, same "Archive/Restore" shape used everywhere else in this
// app for a reversible status flag.
export async function setActionItemCompleted(id: string, completed: boolean) {
  return supabase
    .from('action_items')
    .update({ completed, completed_at: completed ? new Date().toISOString() : null })
    .eq('id', id)
    .select(ACTION_ITEM_COLUMNS)
    .single()
}
