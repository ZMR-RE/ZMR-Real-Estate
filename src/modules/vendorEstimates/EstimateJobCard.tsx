import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import type { VendorInput } from '../vendors/vendorsQueries'
import { VendorEstimateForm } from './VendorEstimateForm'
import { ChooseWinnerForm } from './ChooseWinnerForm'
import type { EstimateJob } from './vendorEstimatesQueries'

interface EstimateJobCardProps {
  job: EstimateJob
  vendorOptions: SearchableSelectOption[]
  onCreateVendor: (input: VendorInput) => Promise<{ id: string } | { error: string }>
  saving: boolean
  isAddingEstimate: boolean
  onStartAddingEstimate: () => void
  onCancelAddingEstimate: () => void
  onAddEstimate: (input: { vendorId: string; amount: number; estimateDate: string; notes: string | null }) => void
  isChoosing: boolean
  onStartChoosing: () => void
  onCancelChoosing: () => void
  onChooseWinner: (estimateId: string, decisionNotes: string | null) => void
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

// Roadmap 8.11(b) — "Status" is never stored; derived here purely from
// whether chosen_estimate_id is set, same as everywhere else this job's
// state is read.
export function EstimateJobCard({
  job,
  vendorOptions,
  onCreateVendor,
  saving,
  isAddingEstimate,
  onStartAddingEstimate,
  onCancelAddingEstimate,
  onAddEstimate,
  isChoosing,
  onStartChoosing,
  onCancelChoosing,
  onChooseWinner,
}: EstimateJobCardProps) {
  const isDecided = job.chosen_estimate_id !== null

  return (
    <div className="estimate-job-card">
      <h4>
        {job.title}
        {job.unit && ` — ${job.unit.unit_label}`}
      </h4>
      <span className={`status-badge ${isDecided ? 'status-badge-success' : 'status-badge-neutral'}`}>
        {isDecided ? 'Decided' : 'Open'}
      </span>
      {job.action_item && <p>Linked task: {job.action_item.title}</p>}

      {job.estimates.length === 0 ? (
        <p className="empty-state">No estimates yet — log one below.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {job.estimates.map((estimate) => (
              <tr key={estimate.id}>
                <td>{estimate.vendor.name}</td>
                <td>{currencyFormatter.format(estimate.amount)}</td>
                <td>{estimate.estimate_date}</td>
                <td>{estimate.notes ?? '—'}</td>
                <td>
                  {job.chosen_estimate_id === estimate.id && (
                    <span className="status-badge status-badge-success">Winner</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isDecided && (
        <p>
          <strong>Why:</strong> {job.decision_notes || '—'} ({job.decided_at})
        </p>
      )}

      {isAddingEstimate ? (
        <VendorEstimateForm
          vendorOptions={vendorOptions}
          onCreateVendor={onCreateVendor}
          saving={saving}
          onSave={onAddEstimate}
          onCancel={onCancelAddingEstimate}
        />
      ) : (
        <button type="button" onClick={onStartAddingEstimate}>
          + Log an estimate
        </button>
      )}

      {job.estimates.length > 0 &&
        (isChoosing ? (
          <ChooseWinnerForm
            estimates={job.estimates}
            currentChosenId={job.chosen_estimate_id}
            saving={saving}
            onChoose={onChooseWinner}
            onCancel={onCancelChoosing}
          />
        ) : (
          <button type="button" onClick={onStartChoosing}>
            {isDecided ? 'Change winner' : 'Choose winner'}
          </button>
        ))}
    </div>
  )
}
