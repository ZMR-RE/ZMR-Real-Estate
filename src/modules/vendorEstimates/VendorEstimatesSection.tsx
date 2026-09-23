import { EditableSection } from '../../shared/EditableSection'
import { useVendorEstimates } from './useVendorEstimates'
import { EstimateJobForm } from './EstimateJobForm'
import { EstimateJobCard } from './EstimateJobCard'

interface VendorEstimatesSectionProps {
  propertyId: string
}

// Roadmap 8.11(b) — same Box interaction standard shape as
// FinancialAccountsSection: view shows the read-only comparison
// history, Edit reveals "+ Add job". Each job's own nested estimates/
// choose-winner actions are always live regardless of this box's own
// view/edit state — same "nested content owns its own state" pattern
// UnitsSection uses for its per-unit Leasing/Tenants/Utility records
// subsections, since logging a quote or picking a winner isn't really
// an "edit" of this box so much as its whole reason to exist.
export function VendorEstimatesSection({ propertyId }: VendorEstimatesSectionProps) {
  const {
    jobs,
    loading,
    error,
    saving,
    vendorOptions,
    onCreateVendor,
    unitOptions,
    actionItemOptions,
    isAddingJob,
    startAddingJob,
    cancelAddingJob,
    addJob,
    addingEstimateForJobId,
    startAddingEstimate,
    cancelAddingEstimate,
    addEstimate,
    choosingForJobId,
    startChoosing,
    cancelChoosing,
    chooseWinner,
  } = useVendorEstimates(propertyId)

  const jobList = (
    <>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : jobs.length === 0 ? (
        <p className="empty-state">No vendor estimates yet — add your first job to start comparing quotes.</p>
      ) : (
        jobs.map((job) => (
          <EstimateJobCard
            key={job.id}
            job={job}
            vendorOptions={vendorOptions}
            onCreateVendor={onCreateVendor}
            saving={saving}
            isAddingEstimate={addingEstimateForJobId === job.id}
            onStartAddingEstimate={() => startAddingEstimate(job.id)}
            onCancelAddingEstimate={cancelAddingEstimate}
            onAddEstimate={(input) => addEstimate(job.id, input)}
            isChoosing={choosingForJobId === job.id}
            onStartChoosing={() => startChoosing(job.id)}
            onCancelChoosing={cancelChoosing}
            onChooseWinner={(estimateId, notes) => chooseWinner(job.id, estimateId, notes)}
          />
        ))
      )}
    </>
  )

  return (
    <EditableSection
      title="Vendor estimates"
      onEditStart={cancelAddingJob}
      view={jobList}
      edit={(exitEditing) => (
        <>
          {jobList}

          {isAddingJob ? (
            <EstimateJobForm
              unitOptions={unitOptions}
              actionItemOptions={actionItemOptions}
              saving={saving}
              onSave={addJob}
              onCancel={cancelAddingJob}
            />
          ) : (
            <button type="button" onClick={startAddingJob}>
              + Add job
            </button>
          )}

          <button type="button" onClick={exitEditing}>
            Done
          </button>
        </>
      )}
    />
  )
}
