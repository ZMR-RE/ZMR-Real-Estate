import { getInsuranceStatus, type InsurancePolicy } from './insuranceQueries'

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

const STATUS_LABELS = { active: 'Active', expired: 'Expired' } as const
const STATUS_BADGE_VARIANTS = { active: 'status-badge-success', expired: 'status-badge-danger' } as const

function StatusBadge({ policy }: { policy: InsurancePolicy }) {
  const status = getInsuranceStatus(policy)
  return <span className={`status-badge ${STATUS_BADGE_VARIANTS[status]}`}>{STATUS_LABELS[status]}</span>
}

function representativeLine(policy: InsurancePolicy): string {
  return [policy.representative_name, policy.representative_phone, policy.representative_email]
    .filter(Boolean)
    .join(' · ')
}

// Stacked labeled block per entry, same reasoning as Property Tax's
// InstallmentCell restructure (9.21) — a run-on inline line reads as
// clutter once documents/coverage dates are all present at once.
//
// Roadmap 7.33 (5) — expanded with deductible, named insured, and a
// structured representative (name/phone/email), replacing the single
// free-text "Contact" row. "Coverage" relabeled Effective/Expiration to
// match this item's own wording.
function CoverageCell({ policy, onViewDocument }: { policy: InsurancePolicy; onViewDocument: (path: string) => void }) {
  return (
    <td>
      <div className="insurance-policy-block">
        <div className="insurance-policy-row">
          <span className="insurance-policy-label">Policy #</span>
          <span>{policy.policy_number ?? '—'}</span>
        </div>
        <div className="insurance-policy-row">
          <span className="insurance-policy-label">Named insured</span>
          <span>{policy.named_insured ?? '—'}</span>
        </div>
        <div className="insurance-policy-row">
          <span className="insurance-policy-label">Effective</span>
          <span>{policy.coverage_start_date ?? '—'}</span>
        </div>
        <div className="insurance-policy-row">
          <span className="insurance-policy-label">Expiration</span>
          <span>{policy.coverage_end_date ?? '—'}</span>
        </div>
        <div className="insurance-policy-row">
          <span className="insurance-policy-label">Premium</span>
          <span>{policy.premium_amount ? currencyFormatter.format(Number(policy.premium_amount)) : '—'}</span>
        </div>
        <div className="insurance-policy-row">
          <span className="insurance-policy-label">Deductible</span>
          <span>{policy.deductible ? currencyFormatter.format(Number(policy.deductible)) : '—'}</span>
        </div>
        <div className="insurance-policy-row">
          <span className="insurance-policy-label">Representative</span>
          <span>{representativeLine(policy) || '—'}</span>
        </div>
        <div className="insurance-policy-row">
          <span className="insurance-policy-label">Payment plan</span>
          <span>{policy.payment_plan ?? '—'}</span>
        </div>
        <div className="insurance-policy-row">
          <span className="insurance-policy-label">Discounts</span>
          <span>{policy.policy_discounts ?? '—'}</span>
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
    <div className="table-scroll">
      <table className="insurance-ledger">
        <thead>
          <tr>
            <th>Provider</th>
            <th>Status</th>
            <th>Coverage</th>
            {!readOnly && <th></th>}
          </tr>
        </thead>
        <tbody>
          {policies.map((policy) => (
            <tr key={policy.id}>
              <td>{policy.provider}</td>
              <td>
                <StatusBadge policy={policy} />
              </td>
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
    </div>
  )
}
