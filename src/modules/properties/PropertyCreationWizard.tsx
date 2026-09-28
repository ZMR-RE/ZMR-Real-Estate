import { useAuth } from '../../shared/auth/AuthContext'
import { useLlcs, NO_LLC_ID } from '../llcs/useLlcs'
import { usePropertyCreationWizard, type WizardStep } from './usePropertyCreationWizard'
import { PropertyCreationOwnershipStep } from './PropertyCreationOwnershipStep'
import { PropertyCreationBasicsStep } from './PropertyCreationBasicsStep'
import { PropertyCreationDocumentsStep } from './PropertyCreationDocumentsStep'
import { PropertyCreationReviewStep } from './PropertyCreationReviewStep'

interface PropertyCreationWizardProps {
  onCancel: () => void
}

const STEP_LABELS = ['Ownership', 'Property basics', 'Documents', 'Review']

// Package 1 — the real, shipped four-step property-creation flow
// (Ownership → Property basics → Documents (optional) → Review),
// approved Sept 28 2026 with three corrections (Documents gets its own
// Review Edit action; unknown percentage reads as a plain non-wrapping
// line; Save/Cancel use the app's universal labels). Lives in place at
// the existing /properties registry route (PropertyRegistry.tsx) — no
// new page or nav item, per CLAUDE.md's navigation-discipline rule.
export function PropertyCreationWizard({ onCancel }: PropertyCreationWizardProps) {
  const { accountId } = useAuth()
  const { llcOptions } = useLlcs(accountId)
  const wizard = usePropertyCreationWizard(accountId)

  const realOwnerOptions = llcOptions.filter((o) => o.id !== NO_LLC_ID)

  const handleCancel = () => {
    wizard.cancel()
    onCancel()
  }

  const handleSave = async () => {
    const result = await wizard.save()
    if (result.kind === 'saved') {
      // Navigation to the new property already happened inside the
      // hook (S1) — nothing further to do here.
      return
    }
    // Errors surface via wizard.error, rendered below; stay on Review.
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <div className="wizard-steps" aria-label={`Step ${wizard.step} of 4: ${STEP_LABELS[wizard.step - 1]}`}>
        {STEP_LABELS.map((label, i) => {
          const n = (i + 1) as WizardStep
          const cls = n === wizard.step ? 'wizard-step wizard-step--active' : n < wizard.step ? 'wizard-step wizard-step--done' : 'wizard-step'
          return (
            <span key={label} className={cls}>
              {n}. {label}
            </span>
          )
        })}
      </div>

      {wizard.error && <p role="alert">{wizard.error}</p>}

      {wizard.step === 1 && (
        <PropertyCreationOwnershipStep
          entries={wizard.ownershipEntries}
          llcOptions={realOwnerOptions}
          allocationStatus={wizard.allocationStatus}
          onAddRow={wizard.addOwnerRow}
          onSetRowMode={wizard.setOwnerRowMode}
          onUpdateRow={wizard.updateOwnerRow}
          onRemoveRow={wizard.removeOwnerRow}
          onAllocationStatusChange={wizard.setAllocationStatus}
        />
      )}
      {wizard.step === 2 && (
        <PropertyCreationBasicsStep
          basics={wizard.basics}
          addressTouched={wizard.addressTouched}
          addressValid={wizard.addressValid}
          onFieldChange={wizard.setBasicsField}
          onAddressBlur={() => wizard.setAddressTouched(true)}
        />
      )}
      {wizard.step === 3 && (
        <PropertyCreationDocumentsStep
          stagedFiles={wizard.stagedFiles}
          onAddFiles={wizard.addStagedFiles}
          onRemoveFile={wizard.removeStagedFile}
          onReattachFile={wizard.reattachStagedFile}
        />
      )}
      {wizard.step === 4 && (
        <PropertyCreationReviewStep
          basics={wizard.basics}
          ownershipEntries={wizard.ownershipEntries}
          llcOptions={realOwnerOptions}
          allocationStatus={wizard.allocationStatus}
          stagedFiles={wizard.stagedFiles}
          onEditBasics={() => wizard.goToStep(2)}
          onEditOwnership={() => wizard.goToStep(1)}
          onEditDocuments={() => wizard.goToStep(3)}
        />
      )}

      <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
        <button type="button" onClick={handleCancel} disabled={wizard.saving}>
          Cancel
        </button>
        <div style={{ flex: 1 }} />
        {wizard.step > 1 && (
          <button type="button" onClick={wizard.goBack} disabled={wizard.saving}>
            Back
          </button>
        )}
        {wizard.step < 4 && (
          <button type="button" onClick={wizard.goNext}>
            {wizard.step === 3 && wizard.stagedFiles.length === 0 ? 'Skip' : 'Next'}
          </button>
        )}
        {wizard.step === 4 && (
          <button type="submit" onClick={handleSave} disabled={wizard.saving}>
            {wizard.saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>
    </div>
  )
}
