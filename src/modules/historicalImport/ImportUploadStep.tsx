interface ImportUploadStepProps {
  parseError: string | null
  onUpload: (file: File) => void
}

// Roadmap 2.4a — step 1 of the wizard: pick a CSV exported from
// whatever spreadsheet the account owner already keeps historical
// bookkeeping in. Parsing happens entirely client-side (useHistoricalImport
// reads the File via the browser's own File API) — nothing is uploaded
// anywhere until the user reaches the final Confirm & Import step.
export function ImportUploadStep({ parseError, onUpload }: ImportUploadStepProps) {
  return (
    <div>
      <h3>Step 1: Choose a CSV file</h3>
      <p>Export your existing spreadsheet as CSV, then choose it here. Nothing is saved until you review and confirm every step below.</p>

      <label htmlFor="historical_import_file">CSV file</label>
      <input
        id="historical_import_file"
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onUpload(file)
        }}
      />

      {parseError && <p role="alert">{parseError}</p>}
    </div>
  )
}
