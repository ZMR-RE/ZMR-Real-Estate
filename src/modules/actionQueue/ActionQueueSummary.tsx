interface ActionQueueSummaryProps {
  overdue: number
  dueThisWeek: number
  upcoming: number
  automated: number
}

// Roadmap 10.5 — top summary strip. Four stat tiles, not a chart (per
// the dataviz skill's own guidance: a single count is a stat tile, not
// a plot) — colored with this app's existing semantic tokens
// (--danger/--warning), the same ones 7.15's row coloring and every
// status-badge already use, rather than a new palette. "Automated"
// stays static at 0 until Phase 11's agent roster exists to populate it.
export function ActionQueueSummary({ overdue, dueThisWeek, upcoming, automated }: ActionQueueSummaryProps) {
  return (
    <div className="action-queue-summary">
      <div className="action-queue-summary-tile action-queue-summary-tile-danger">
        <span className="action-queue-summary-count">{overdue}</span>
        <span className="action-queue-summary-label">Overdue</span>
      </div>
      <div className="action-queue-summary-tile action-queue-summary-tile-warning">
        <span className="action-queue-summary-count">{dueThisWeek}</span>
        <span className="action-queue-summary-label">Due this week</span>
      </div>
      <div className="action-queue-summary-tile">
        <span className="action-queue-summary-count">{upcoming}</span>
        <span className="action-queue-summary-label">Upcoming</span>
      </div>
      <div className="action-queue-summary-tile">
        <span className="action-queue-summary-count">{automated}</span>
        <span className="action-queue-summary-label">Automated</span>
      </div>
    </div>
  )
}
