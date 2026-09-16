import type { ActionItem } from './actionItemsQueries'

export type ActionItemPriority = 'red' | 'yellow' | 'normal'

// "Due soon" = within the next 7 days (inclusive of today) — a full
// week's lead time to act before something goes overdue, without
// flagging so far out that most of the board looks urgent. Roadmap 7.15
// left this threshold to be chosen; 7 days was picked as the reasonable
// default.
const DUE_SOON_DAYS = 7

function startOfToday(): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

// Reads item.property.status directly off the item's live joined
// property on every call — never a snapshot copied onto the action item
// at creation time — so flipping a property to 'sold' turns all of its
// open items red immediately, with no per-item write or special-case
// trigger needed (roadmap 7.15).
export function actionItemPriority(item: ActionItem): ActionItemPriority {
  if (item.property?.status === 'sold') return 'red'

  const today = startOfToday()
  const dueDate = new Date(`${item.due_date}T00:00:00`)

  if (dueDate < today) return 'red'

  const soonThreshold = new Date(today)
  soonThreshold.setDate(soonThreshold.getDate() + DUE_SOON_DAYS)
  if (dueDate <= soonThreshold) return 'yellow'

  return 'normal'
}
