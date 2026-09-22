import type { InsurancePolicy } from './insuranceQueries'

interface InsuranceLedgerListProps {
  policies: InsurancePolicy[]
  // Roadmap 7.25 — Box interaction standard: the box's default view
  // state shows plain read-only labels, no per-row Edit. Same pattern
  // as FinancialAccountList's readOnly prop.
  readOnly?: boolean
  onEdit?: (id: string) => void
  onViewDocument: (path: string) => void
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

// Stacked labeled block per entry, same reasoning as Property Tax's
// InstallmentCell restructure (9.21) — a run-on inline line reads as
// clutter once documents/coverage dates are all present at once.
function CoverageCell({ policy, onViewDocument }: { policy: InsurancePolicy; onViewDocument: (path: string) => void }) {
  return (
    <td>
      <div className="insurance-policy-block">
        <div className="insurance-policy-row">
          <span className="insurance-policy-label">Policy #</span>
          <span>{policy.policy_number ?? '—'}</span>
        </div>
        <div className="insurance-policy-row">
          <span className="insurance-policy-label">Contact</span>
          <span>{policy.contact_info ?? '—'}</span>
        </div>
        <div className="insurance-policy-row">
          <span className="insurance-policy-label">Coverage</span>
          <span>
            {policy.coverage_start_date ?? '—'} – {policy.coverage_end_date ?? '—'}
          </span>
        </div>
        <div className="insurance-policy-row">
          <span className="insurance-policy-label">Premium</span>
          <span>{policy.premium_amount ? currencyFormatter.format(Number(policy.premium_amount)) : '—'}</span>
        </div>
        <div className="insurance-policy-row">
          <span className="insurance-policy-label">Documents</span>
          {policy.documents.length === 0 ? (
            <span>—</span>
          ) : (
            <span className="insurance-policy-documents-inline">
              {policy.documents.map((doc, i) => (
                <button key={doc.id} type="button" onClick={() => onViewDocument(doc.storage_path)}>
                  {policy.documents.length > 1 ? `View document ${i + 1}` : 'View document'}
                </button>
              ))}
            </span>
          )}
        </div>
      </div>
    </td>
  )
}

export function InsuranceLedgerList({ policies, readOnly = false, onEdit, onViewDocument }: InsuranceLedgerListProps) {
  if (policies.length === 0) {
    return <p className="empty-state">No insurance policies recorded yet.</p>
  }

  return (
    <table className="insurance-ledger">
      <thead>
        <tr>
          <th>Provider</th>
          <th>Coverage</th>
          {!readOnly && <th></th>}
        </tr>
      </thead>
      <tbody>
        {policies.map((policy) => (
          <tr key={policy.id}>
            <td>{policy.provider}</td>
            <CoverageCell policy={policy} onViewDocument={onViewDocument} />
            {!readOnly && (
              <td>
                <button type="button" onClick={() => onEdit?.(policy.id)}>
                  Edit
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
