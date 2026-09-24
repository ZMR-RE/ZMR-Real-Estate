import { useState } from 'react'
import {
  computeInsuranceTermStatus,
  insuranceTermUrgency,
  termCountdownPhrase,
  type InsurancePolicy,
  type InsuranceTermStatus,
} from './insuranceQueries'
import { InsurancePolicyDocumentsList } from './InsurancePolicyDocumentsList'

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

const TERM_STATUS_LABELS: Record<InsuranceTermStatus['kind'], string> = {
  within: 'Within recorded term',
  upcoming: 'Upcoming term',
  ended: 'Term ended',
  incomplete: 'Dates incomplete',
  invalid_range: 'Invalid date range',
}

const URGENCY_BADGE_VARIANTS = {
  success: 'status-badge-success',
  accent: 'status-badge-accent',
  warning: 'status-badge-warning',
  danger: 'status-badge-danger',
  neutral: 'status-badge-neutral',
} as const

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Batch O5 — "these labels describe entered dates, not insurer-confirmed
// coverage." The badge names one of the five states (never green/
// "Active" for a term with no confirmable dates); the parenthetical
// count-down is a plain fact about the same recorded dates, never an
// assertion that coverage is actually in force.
function TermStatusBadge({ status }: { status: InsuranceTermStatus }) {
  const urgency = insuranceTermUrgency(status)
  return <span className={`status-badge ${URGENCY_BADGE_VARIANTS[urgency]}`}>{TERM_STATUS_LABELS[status.kind]}</span>
}

function dateRangeText(policy: InsurancePolicy): string | null {
  const { coverage_start_date: start, coverage_end_date: end } = policy
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`
  if (start) return `Effective ${formatDate(start)}`
  if (end) return `Ends ${formatDate(end)}`
  return null
}

// Batch O — "Preserve zero vs missing." A missing premium is omitted
// entirely (CLAUDE.md's Empty field visibility rule); a recorded value
// — including a real "0" — is shown exactly as entered, always paired
// with the honest basis disclaimer rather than a bare dollar figure
// that would read as a confirmed annual/period total.
function premiumText(policy: InsurancePolicy): string | null {
  if (policy.premium_amount === null) return null
  return `${currencyFormatter.format(Number(policy.premium_amount))} — basis not recorded`
}

function representativeLine(policy: InsurancePolicy): string | null {
  const line = [policy.representative_name, policy.representative_phone, policy.representative_email]
    .filter(Boolean)
    .join(' · ')
  return line || null
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="insurance-policy-row">
      <span className="insurance-policy-label">{label}</span>
      <span>{value}</span>
    </div>
  )
}

// INS-1 — the compact, always-visible row beneath the header: only the
// fields actually present on this policy (provider is already in the
// header; term status always has *some* honest label even with zero
// dates recorded, so it's never blank).
function SummaryRow({ policy, status }: { policy: InsurancePolicy; status: InsuranceTermStatus }) {
  const countdown = termCountdownPhrase(status)
  const parts = [
    dateRangeText(policy),
    countdown,
    policy.policy_number ? `Policy #${policy.policy_number}` : null,
    premiumText(policy),
    policy.payment_plan,
  ].filter((part): part is string => Boolean(part))

  return <p className="insurance-policy-summary-row">{parts.join(' · ')}</p>
}

// INS-1 item 3 — the three named groups side by side on wide screens
// (reflowing 2/1 at narrower widths via .field-group-row, same
// breakpoints Edit uses), reusing Property Information's own
// `.property-field-group` classes so View and Edit read as the same
// underlying structure. A group with nothing to show is omitted
// entirely rather than rendering an empty titled box (CLAUDE.md's
// Empty field visibility rule applied at the group level, not just the
// field level).
function ExpandedGroups({ policy, status }: { policy: InsurancePolicy; status: InsuranceTermStatus }) {
  const hasIdentification = Boolean(policy.policy_number || policy.named_insured)
  const representative = representativeLine(policy)
  const hasContacts = Boolean(representative || policy.payment_plan || policy.policy_discounts)
  const premium = premiumText(policy)
  const countdown = termCountdownPhrase(status)

  return (
    <div className="field-group-row">
      {hasIdentification && (
        <div className="property-field-group">
          <h4 className="property-field-group-title">Policy identification</h4>
          {policy.policy_number && <InfoRow label="Policy #" value={policy.policy_number} />}
          {policy.named_insured && <InfoRow label="Named insured" value={policy.named_insured} />}
        </div>
      )}

      <div className="property-field-group">
        <h4 className="property-field-group-title">Coverage & cost</h4>
        <div className="insurance-policy-row">
          <span className="insurance-policy-label">Coverage dates</span>
          <span>
            <TermStatusBadge status={status} />
            {countdown && ` (${countdown})`}
          </span>
        </div>
        {(policy.coverage_start_date || policy.coverage_end_date) && (
          <InfoRow label="Recorded dates" value={dateRangeText(policy) ?? '—'} />
        )}
        {premium && <InfoRow label="Premium" value={premium} />}
        {policy.deductible !== null && (
          <InfoRow label="Deductible" value={currencyFormatter.format(Number(policy.deductible))} />
        )}
      </div>

      {hasContacts && (
        <div className="property-field-group">
          <h4 className="property-field-group-title">Contacts & extras</h4>
          {representative && <InfoRow label="Representative" value={representative} />}
          {policy.payment_plan && <InfoRow label="Payment plan" value={policy.payment_plan} />}
          {policy.policy_discounts && <InfoRow label="Discounts" value={policy.policy_discounts} />}
        </div>
      )}
    </div>
  )
}

// INS-1 item 4 — Documents pulled out of Contacts & extras into their
// own compact expandable area; omitted entirely when there are none
// (view mode never shows a standing "+ Add" affordance — that only
// lives in Edit, per CLAUDE.md's Box interaction standard).
function DocumentsArea({ policy, onViewDocument }: { policy: InsurancePolicy; onViewDocument: (path: string) => void }) {
  if (policy.documents.length === 0) return null

  return (
    <details className="insurance-policy-documents-area">
      <summary>Documents ({policy.documents.length})</summary>
      <InsurancePolicyDocumentsList documents={policy.documents} onViewDocument={onViewDocument} />
    </details>
  )
}

function PolicyCard({
  policy,
  defaultExpanded,
  readOnly,
  onEdit,
  onViewDocument,
}: {
  policy: InsurancePolicy
  defaultExpanded: boolean
  readOnly: boolean
  onEdit?: (id: string) => void
  onViewDocument: (path: string) => void
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const status = computeInsuranceTermStatus(policy)

  return (
    <div className="insurance-policy-card">
      <div className="insurance-policy-card-header">
        <span className="insurance-policy-provider">{policy.provider}</span>
        <TermStatusBadge status={status} />
        <button type="button" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Hide details' : 'Show details'}
        </button>
        {!readOnly && (
          <button type="button" onClick={() => onEdit?.(policy.id)}>
            Edit
          </button>
        )}
      </div>

      <SummaryRow policy={policy} status={status} />

      {/* Review cleanup — no change-history timeline or renewal-reminder
          control is rendered here: neither has real data behind it yet
          (no audit trigger on property_insurance_policies; no reminder
          storage/Action Queue wiring — tracked in the Batch O planning
          docs and owner checklist, not repeated as on-card copy). Showing
          nothing is the honest state, not a gap to explain to the owner
          on every single card. */}
      {expanded && (
        <>
          <ExpandedGroups policy={policy} status={status} />
          <DocumentsArea policy={policy} onViewDocument={onViewDocument} />
        </>
      )}
    </div>
  )
}

export function InsuranceLedgerList({ policies, readOnly = false, onEdit, onViewDocument }: InsuranceLedgerListProps) {
  if (policies.length === 0) {
    return <p className="empty-state">No insurance policies yet — add your first one to keep track of coverage.</p>
  }

  return (
    <div className="insurance-policy-cards">
      {policies.map((policy, index) => (
        <PolicyCard
          key={policy.id}
          policy={policy}
          // O1 — "keep prior policy terms accessible without allowing
          // them to swamp current records": only the most recent policy
          // (index 0, per the existing coverage_start_date/created_at
          // sort) starts expanded; older terms are one click away.
          defaultExpanded={index === 0}
          readOnly={readOnly}
          onEdit={onEdit}
          onViewDocument={onViewDocument}
        />
      ))}
    </div>
  )
}
