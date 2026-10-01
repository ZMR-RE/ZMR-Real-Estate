import { formatDateOnly } from '../../shared/dateFormat'
import { formatRent } from '../leases/leaseFormLogic'
import type { Lease } from '../leases/leasesQueries'
import '../leases/leases.css'

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
        <strong>{unitLabel} already has a current or upcoming tenancy.</strong> What are you adding?
      </p>
      {currentLeases.map((l) => (
        <div key={l.id} className="lease-choice-option">
          <span>
            <strong>A co-tenant on {names(l)}’s tenancy</strong> — joins it and shares its {formatRent(l.rent_amount)} rent (from{' '}
            {formatDateOnly(l.start_date)}). No new rent is added.
          </span>
          <button type="button" onClick={() => onCoTenant(l)}>
            Add co-tenant
          </button>
        </div>
      ))}
      <div className="lease-choice-option">
        <span>
          <strong>A separate tenancy with its own rent</strong> — a second rental arrangement on this unit; its rent is counted in addition. If the current
          tenancy has ended, end it first with “+ End lease” in Units.
        </span>
        <button type="button" onClick={onSeparate}>
          Create separate tenancy
        </button>
      </div>
    </div>
  )
}
