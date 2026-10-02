import { formatRent, shortLeaseId } from './leaseFormLogic'
import { TenancyKindChoice } from './TenancyKindChoice'
import { UnfinishedTenancyChoice } from './UnfinishedTenancyChoice'
import type { TenancyChoiceState } from './useTenancyChoice'

interface TenancyChoicePanelProps {
  tc: TenancyChoiceState
  unitLabel: string
}

// The choice step before the lease form, and once chosen, a one-line note of
// what's being added with "Change". Shared by Tenants › + Add tenant and
// Units › + Add lease.
export function TenancyChoicePanel({ tc, unitLabel }: TenancyChoicePanelProps) {
  const choice = tc.choice
  return (
    <>
      {tc.needsUnfinishedChoice && (
        <UnfinishedTenancyChoice leases={tc.unfinished} onResume={(lease) => tc.choose({ kind: 'resume', lease })} onStartNew={tc.skipUnfinished} />
      )}
      {tc.needsKindChoice && (
        <TenancyKindChoice
          unitLabel={unitLabel}
          currentLeases={tc.current}
          onCoTenant={(lease) => tc.choose({ kind: 'cotenant', lease })}
          onSeparate={() => tc.choose({ kind: 'new' })}
        />
      )}
      {choice && (choice.kind !== 'new' || tc.current.length > 0) && (
        <p className="field-hint">
          {choice.kind === 'resume' && <>Finishing tenancy ID {shortLeaseId(choice.lease.id)}: choose its tenant(s) and Save. No second tenancy is created.</>}
          {choice.kind === 'cotenant' && (
            <>
              Adding co-tenant(s) to {choice.lease.tenants.map((t) => t.name).join(' & ')}’s tenancy. Its {formatRent(choice.lease.rent_amount)} rent, dates and fees stay
              as they are.
            </>
          )}
          {choice.kind === 'new' && <>A separate tenancy with its own rent, counted in addition to the current one.</>}{' '}
          {tc.canChange && (
            <button type="button" onClick={tc.reset}>
              Change
            </button>
          )}
        </p>
      )}
    </>
  )
}
