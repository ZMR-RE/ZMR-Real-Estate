import { useMarketFinancialSnapshot } from '../propertyKpi/useMarketFinancialSnapshot'
import { useActionQueue } from '../actionQueue/useActionQueue'
import type { Transaction } from '../financials/financialsQueries'
import type { ActivityLogEntry } from '../capture/captureQueries'

interface PropertySnapshotPanelProps {
  propertyId: string
  transactions: Transaction[]
  activity: ActivityLogEntry[]
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

// Roadmap 7.30 — a slim, read-only "at a glance" panel next to Overview's
// main content, reusing data three other surfaces already compute rather
// than adding new queries: equity comes from the same hook the KPI tab's
// Market & financial snapshot card uses, next due item from the same
// useActionQueue hook the Follow-ups card and main Action Queue board
// use (scoped to this property), and latest activity from the activity
// log this tab's parent already fetches for the Activity tab.
export function PropertySnapshotPanel({ propertyId, transactions, activity }: PropertySnapshotPanelProps) {
  const { snapshot } = useMarketFinancialSnapshot(propertyId, transactions)
  const { items: actionItems } = useActionQueue(propertyId)

  const nextDue = actionItems
    .filter((item) => !item.completed)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0] ?? null

  const latestActivity = activity[0] ?? null

  return (
    <aside className="property-snapshot-panel">
      <h3 className="property-snapshot-title">Snapshot</h3>

      <div className="property-snapshot-item">
        <span className="property-snapshot-label">Estimated equity</span>
        <span className="property-snapshot-value">
          {snapshot.equity ? currencyFormatter.format(snapshot.equity.equity) : 'Not enough data yet'}
        </span>
      </div>

      <div className="property-snapshot-item">
        <span className="property-snapshot-label">Next due</span>
        {nextDue ? (
          <span className="property-snapshot-value">
            {nextDue.title} — {nextDue.due_date}
          </span>
        ) : (
          <span className="property-snapshot-value property-snapshot-empty">Nothing due</span>
        )}
      </div>

      <div className="property-snapshot-item">
        <span className="property-snapshot-label">Latest activity</span>
        {latestActivity ? (
          <span className="property-snapshot-value">
            {latestActivity.entry_type === 'visit' ? 'Visit' : 'Communication'} — {latestActivity.entry_date}
          </span>
        ) : (
          <span className="property-snapshot-value property-snapshot-empty">No activity logged yet</span>
        )}
      </div>
    </aside>
  )
}
