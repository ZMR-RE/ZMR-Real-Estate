import { ActionItemList } from '../actionQueue/ActionItemList'
import type { ActionItem } from '../actionQueue/actionItemsQueries'

interface FollowUpsCardProps {
  loading: boolean
  error: string | null
  groups: [string, ActionItem[]][]
  processingId: string | null
  onComplete: (item: ActionItem) => void
}

// Roadmap 7.13's Follow-ups card, now backed by the unified Action Queue
// data model (roadmap 10.2) — action_items filtered to this property,
// grouped by type same as the portfolio-wide board. Read summary + a
// Complete action, same weight as the other KPI cards; adding a new
// action item happens on the main Action Queue page, not here.
export function FollowUpsCard({ loading, error, groups, processingId, onComplete }: FollowUpsCardProps) {
  if (loading) {
    return <p>Loading…</p>
  }

  if (error) {
    return <p role="alert">{error}</p>
  }

  if (groups.length === 0) {
    return <p className="empty-state">No open follow-ups for this property.</p>
  }

  return (
    <>
      {groups.map(([type, items]) => (
        <div key={type}>
          {/* Roadmap 7.46 — second-tier heading inside the already-titled
              "Follow-ups" CollapsibleSection: .property-details-title. */}
          <h4 className="property-details-title">{type}</h4>
          <ActionItemList items={items} processingId={processingId} onComplete={onComplete} showProperty={false} />
        </div>
      ))}
    </>
  )
}
