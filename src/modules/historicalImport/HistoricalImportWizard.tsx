import { useHistoricalImport } from './useHistoricalImport'
import { ImportUploadStep } from './ImportUploadStep'
import { ImportPropertyStep } from './ImportPropertyStep'
import { ImportMappingStep } from './ImportMappingStep'
import { ImportResolveStep } from './ImportResolveStep'
import { ImportPreviewStep } from './ImportPreviewStep'

interface HistoricalImportWizardProps {
  onClose: () => void
}

// Roadmap 2.4a — Historical Data Backfill's intelligent-mapping CSV
// import: upload → pick property → map columns (pre-filled guesses,
// user confirms) → resolve distinct values (Income/Expense, Category,
// Vendor) → preview the exact rows that will be written → confirm.
// Nothing reaches financial_transactions before the final explicit
// confirm (CLAUDE.md Data integrity: never silently guess and commit).
export function HistoricalImportWizard({ onClose }: HistoricalImportWizardProps) {
  const {
    step,
    fileName,
    csv,
    parseError,
    uploadFile,
    propertyOptions,
    propertyId,
    setPropertyId,
    confirmProperty,
    mapping,
    setFieldMapping,
    defaultPaymentMethod,
    setDefaultPaymentMethod,
    confirmMapping,
    distinctEntryTypeValues,
    entryTypeResolution,
    setEntryTypeResolution,
    distinctCategoryKeys,
    categoryResolution,
    setCategoryResolution,
    distinctVendorValues,
    vendorResolution,
    setVendorResolution,
    vendorOptions,
    confirmResolution,
    buildPreviewRows,
    saving,
    error,
    result,
    runImport,
    setStep,
    reset,
  } = useHistoricalImport()

  return (
    <div className="historical-import-wizard">
      {step === 'upload' && <ImportUploadStep parseError={parseError} onUpload={uploadFile} />}

      {step === 'property' && csv && (
        <ImportPropertyStep
          fileName={fileName}
          rowCount={csv.rows.length}
          propertyOptions={propertyOptions}
          propertyId={propertyId}
          onPropertyChange={setPropertyId}
          onConfirm={confirmProperty}
        />
      )}

      {step === 'mapping' && csv && mapping && (
        <ImportMappingStep
          headers={csv.headers}
          mapping={mapping}
          onFieldMapping={setFieldMapping}
          defaultPaymentMethod={defaultPaymentMethod}
          onDefaultPaymentMethodChange={setDefaultPaymentMethod}
          onConfirm={confirmMapping}
          onBack={() => setStep('property')}
        />
      )}

      {step === 'resolve' && (
        <ImportResolveStep
          entryTypeValues={distinctEntryTypeValues()}
          entryTypeResolution={entryTypeResolution}
          onEntryTypeChange={(raw, value) => setEntryTypeResolution((prev) => ({ ...prev, [raw]: value }))}
          categoryKeys={distinctCategoryKeys()}
          categoryResolution={categoryResolution}
          onCategoryChange={(key, value) => setCategoryResolution((prev) => ({ ...prev, [key]: value }))}
          vendorValues={distinctVendorValues()}
          vendorResolution={vendorResolution}
          onVendorChange={(raw, value) => setVendorResolution((prev) => ({ ...prev, [raw]: value }))}
          vendorOptions={vendorOptions}
          onConfirm={confirmResolution}
          onBack={() => setStep('mapping')}
        />
      )}

      {step === 'preview' && (
        <ImportPreviewStep
          rows={buildPreviewRows()}
          saving={saving}
          error={error}
          onConfirm={runImport}
          onBack={() => setStep('resolve')}
        />
      )}

      {step === 'done' && result && (
        <div>
          <h3>Import complete</h3>
          <p>
            Imported {result.imported} transaction{result.imported === 1 ? '' : 's'}
            {result.skipped > 0 ? `, skipped ${result.skipped}` : ''}
            {result.newVendors > 0 ? `, created ${result.newVendors} new vendor${result.newVendors === 1 ? '' : 's'}` : ''}.
          </p>
          <button type="button" onClick={onClose}>
            Done
          </button>
          <button type="button" onClick={reset}>
            Import another file
          </button>
        </div>
      )}

      {step !== 'done' && (
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      )}
    </div>
  )
}
