import { daysUntilExpiration, getInsuranceStatus, insuranceExpirationUrgency, type InsurancePolicy } from './insuranceQueries'

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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="insurance-policy-row">
      <span className="insurance-policy-label">{label}</span>
      <span>{value}</span>
    </div>
  )
}

function representativeLine(policy: InsurancePolicy): string {
  return [policy.representative_name, policy.representative_phone, policy.representative_email]
    .filter(Boolean)
    .join(' · ')
}

function expirationPhrase(days: number): string {
  if (days < 0) return `expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`
  if (days === 0) return 'expires today'
  return `expires in ${days} day${days === 1 ? '' : 's'}`
}

// Personality pass — the same colored-"story"-number treatment as the
// Units-occupied stat card, applied to Insurance's coverage-expiration
// date: green/amber/red by how far off it is, not just a plain date.
function ExpirationValue({ policy }: { policy: InsurancePolicy }) {
  if (!policy.coverage_end_date) return <span>—</span>

  const days = daysUntilExpiration(policy)
  const urgency = insuranceExpirationUrgency(policy)

  return (
    <span className={`insurance-expiration-value--${urgency}`}>
      {policy.coverage_end_date}
      {days !== null && ` (${expirationPhrase(days)})`}
    </span>
  )
}

// Insurance box overhaul, item 2 — one dedicated card per policy,
// replacing the old 3-column table (Provider/Status/Coverage) that
// crammed 10+ field types into a single Coverage cell. Grouped into the
// same three named sections as the Edit form (InsurancePolicyForm.tsx):
// Policy identification, Coverage & cost, Contact & extras — the exact
// `.property-field-group` classes Property Information's field groups
// use, so View and Edit read as the same underlying structure rather
// than two unrelated layouts for the same data.
function PolicyCard({
  policy,
  readOnly,
  onEdit,
  onViewDocument,
}: {
  policy: InsurancePolicy
  readOnly: boolean
  onEdit?: (id: string) => void
  onViewDocument: (path: string) => void
}) {
  return (
    <div className="insurance-policy-card">
      <div className="insurance-policy-card-header">
        <span className="insurance-policy-provider">{policy.provider}</span>
        <StatusBadge policy={policy} />
        {!readOnly && (
          <button type="button" onClick={() => onEdit?.(policy.id)}>
            Edit
          </button>
        )}
      </div>

      <div className="property-field-group">
        <h4 className="property-field-group-title">Policy identification</h4>
        <InfoRow label="Policy #" value={policy.policy_number ?? '—'} />
        <InfoRow label="Named insured" value={policy.named_insured ?? '—'} />
      </div>

      <div className="property-field-group">
        <h4 className="property-field-group-title">Coverage & cost</h4>
        <InfoRow label="Effective" value={policy.coverage_start_date ?? '—'} />
        <div className="insurance-policy-row">
          <span className="insurance-policy-label">Expiration</span>
          <ExpirationValue policy={policy} />
        </div>
        <InfoRow label="Premium" value={policy.premium_amount ? currencyFormatter.format(Number(policy.premium_amount)) : '—'} />
        <InfoRow label="Deductible" value={policy.deductible ? currencyFormatter.format(Number(policy.deductible)) : '—'} />
      </div>

      <div className="property-field-group">
        <h4 className="property-field-group-title">Contact & extras</h4>
        <InfoRow label="Representative" value={representativeLine(policy) || '—'} />
        <InfoRow label="Payment plan" value={policy.payment_plan ?? '—'} />
        <InfoRow label="Discounts" value={policy.policy_discounts ?? '—'} />
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
    </div>
  )
}

export function InsuranceLedgerList({ policies, readOnly = false, onEdit, onViewDocument }: InsuranceLedgerListProps) {
  if (policies.length === 0) {
    return <p className="empty-state">No insurance policies yet — add your first one to keep track of coverage.</p>
  }

  return (
    <div className="insurance-policy-cards">
      {policies.map((policy) => (
        <PolicyCard key={policy.id} policy={policy} readOnly={readOnly} onEdit={onEdit} onViewDocument={onViewDocument} />
      ))}
    </div>
  )
}
