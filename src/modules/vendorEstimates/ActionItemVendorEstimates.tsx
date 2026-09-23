import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthContext'
import { listEstimateJobsForActionItem, type EstimateJob } from './vendorEstimatesQueries'

interface ActionItemVendorEstimatesProps {
  actionItemId: string
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

// Roadmap 8.11(b) — the task→job half of the cross-reference (the
// job→task half is EstimateJobCard's own "Linked task" line). Only
// renders anything when at least one estimate job actually links back
// to this action item — most tasks have none, and this stays silent
// rather than showing an empty "Vendor estimates" heading for them.
// Links to the property's own Overview tab (where the Vendor estimates
// box lives) rather than deep-linking to one job — same "no per-row
// anchor exists yet" tradeoff the 9.9 bridge's "View transaction" link
// already accepted for Financials.
export function ActionItemVendorEstimates({ actionItemId }: ActionItemVendorEstimatesProps) {
  const { accountId } = useAuth()
  const [jobs, setJobs] = useState<EstimateJob[]>([])

  useEffect(() => {
    if (!accountId) return
    listEstimateJobsForActionItem(accountId, actionItemId).then(({ data }) => {
      setJobs(data ?? [])
    })
  }, [accountId, actionItemId])

  if (jobs.length === 0) return null

  return (
    <div>
      <h4 className="property-details-title">Vendor estimates for this task</h4>
      <ul>
        {jobs.map((job) => {
          const chosen = job.estimates.find((e) => e.id === job.chosen_estimate_id)
          return (
            <li key={job.id}>
              {job.title} — {job.chosen_estimate_id ? `Decided: ${chosen?.vendor.name} (${chosen ? currencyFormatter.format(chosen.amount) : ''})` : `Open (${job.estimates.length} estimate${job.estimates.length === 1 ? '' : 's'})`}{' '}
              <Link to={`/properties/${job.property_id}`}>View on property</Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
