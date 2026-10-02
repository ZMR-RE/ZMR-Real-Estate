import { formatDateOnly } from '../../shared/dateFormat'
import { formatRent, shortLeaseId } from './leaseFormLogic'
import type { Lease } from './leasesQueries'
import './leases.css'

interface UnfinishedTenancyChoiceProps {
  leases: Lease[]
  onResume: (lease: Lease) => void
  onStartNew: () => void
}

// Shown before adding a tenancy to a unit that has an unfinished one (a lease
// saved without its tenants — see leaseEntryQueries.ts). The owner chooses:
// resume that exact lease by ID, or start a separate one. Nothing is deleted
// or adopted automatically.
export function UnfinishedTenancyChoice({ leases, onResume, onStartNew }: UnfinishedTenancyChoiceProps) {
  return (
    <div className="lease-choice" role="status">
      <p>
        <strong>Unfinished tenancy on this unit.</strong> A lease was saved, but its tenants were never linked. Resume it to finish it — starting another
        could count its rent twice.
      </p>
      {leases.map((l) => (
        <div key={l.id} className="lease-choice-option">
          <span>
            Tenancy ID {shortLeaseId(l.id)}
            {l.created_at && <> · saved {formatDateOnly(l.created_at.slice(0, 10))}</>} · starts {formatDateOnly(l.start_date)} · rent {formatRent(l.rent_amount)}
          </span>
          <button type="button" onClick={() => onResume(l)}>
            Resume tenancy {shortLeaseId(l.id)}
          </button>
        </div>
      ))}
      <button type="button" onClick={onStartNew}>
        Start a separate new tenancy instead
      </button>
      <p className="field-hint">The unfinished tenancy is left as it is — never deleted or used without you choosing it. You can archive it in Lease history.</p>
    </div>
  )
}
