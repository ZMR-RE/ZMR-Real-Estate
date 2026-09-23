import { CATEGORY_LABELS } from '../financials/financialsQueries'

interface PreviewRowLike {
  rowIndex: number
  valid: boolean
  error: string | null
  date: string | null
  amount: number | null
  entryType: 'income' | 'expense' | null
  category: string | null
  vendorName: string | null
  paymentMethod: string
  description: string | null
}

interface ImportPreviewStepProps {
  rows: PreviewRowLike[]
  saving: boolean
  error: string | null
  onConfirm: () => void
  onBack: () => void
}

const PREVIEW_LIMIT = 15

// Roadmap 2.4a — step 5, the last stop before anything saves. Shows
// every row exactly as it will be written (not just the mapping choices
// that produced it), and every row that failed to resolve — so the
// review is of real output, not of intent.
export function ImportPreviewStep({ rows, saving, error, onConfirm, onBack }: ImportPreviewStepProps) {
  const validCount = rows.filter((r) => r.valid).length
  const invalidRows = rows.filter((r) => !r.valid)
  const preview = rows.slice(0, PREVIEW_LIMIT)

  return (
    <div>
      <h3>Step 5: Preview and confirm</h3>
      <p>
        {validCount} of {rows.length} rows are ready to import
        {invalidRows.length > 0 ? `; ${invalidRows.length} will be skipped (shown below).` : '.'}
      </p>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Category</th>
            <th>Vendor</th>
            <th>Payment method</th>
            <th>Description</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {preview.map((row) => (
            <tr key={row.rowIndex} className={row.valid ? undefined : 'row-voided'}>
              <td>{row.date ?? '—'}</td>
              <td>{row.entryType === 'income' ? 'Income' : row.entryType === 'expense' ? 'Expense' : '—'}</td>
              <td>{row.category ? CATEGORY_LABELS[row.category as keyof typeof CATEGORY_LABELS] : '—'}</td>
              <td>{row.vendorName ?? '—'}</td>
              <td>{row.paymentMethod || '—'}</td>
              <td>{row.description ?? ''}</td>
              <td>{row.amount === null ? '—' : `$${row.amount.toFixed(2)}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > PREVIEW_LIMIT && <p>…and {rows.length - PREVIEW_LIMIT} more row(s), not shown here.</p>}

      {invalidRows.length > 0 && (
        <div>
          {/* Roadmap 7.46 — second-tier heading inside this already-titled
              step ("Step 5: Preview and confirm"): .property-details-title. */}
          <h4 className="property-details-title">Rows that will be skipped</h4>
          <ul>
            {invalidRows.map((row) => (
              <li key={row.rowIndex}>{row.error}</li>
            ))}
          </ul>
        </div>
      )}

      {error && <p role="alert">{error}</p>}

      <button type="button" onClick={onConfirm} disabled={saving || validCount === 0}>
        {saving ? 'Importing…' : `Confirm & import ${validCount} transaction${validCount === 1 ? '' : 's'}`}
      </button>
      <button type="button" onClick={onBack} disabled={saving}>
        Back
      </button>
    </div>
  )
}
