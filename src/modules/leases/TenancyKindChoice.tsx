import { formatDateOnly } from '../../shared/dateFormat'
import { formatRent } from './leaseFormLogic'
import type { Lease } from './leasesQueries'
import './leases.css'

interface TenancyKindChoiceProps {
  unitLabel: string
  currentLeases: Lease[]
  onCoTenant: (lease: Lease) => void
  onSeparate: () => void
}

const names = (l: Lease) => l.tenants.map((t) => t.name).join(' & ')

// The unit already has a current or upcoming tenancy: the owner says which
// they mean before anything is entered — a co-tenant joining that tenancy
// (its rent unchanged, counted once) or a separate tenancy whose rent is
// counted in addition. Neither is assumed.
export function TenancyKindChoice({ unitLabel, currentLeases, onCoTenant, onSeparate }: TenancyKindChoiceProps) {
  return (
    <div className="lease-choice" role="group" aria-label="What are you adding?">
      <p>
        <strong>{unitLabel} already has a tenancy.</strong> What are you adding?
      </p>
      {currentLeases.map((l) => (
        <div key={l.id} className="lease-choice-option">
          <span>
            <strong>Co-tenant on {names(l)}’s tenancy</strong> ({formatRent(l.rent_amount)}, from {formatDateOnly(l.start_date)}) — shares that rent; no new rent.
          </span>
          <button type="button" onClick={() => onCoTenant(l)}>
            Add co-tenant
          </button>
        </div>
      ))}
      <div className="lease-choice-option">
        <span>
          <strong>Separate tenancy</strong> — its own rent, counted in addition. If the current tenancy has ended, end it in Units first.
        </span>
        <button type="button" onClick={onSeparate}>
          Create separate tenancy
        </button>
      </div>
    </div>
  )
}
