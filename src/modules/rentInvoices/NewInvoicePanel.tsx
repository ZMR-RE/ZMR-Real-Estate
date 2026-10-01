import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SearchableSelect } from '../../shared/SearchableSelect'
import type { BlockerInfo } from './invoiceBlockers'
import { nextMonth, periodFromMonth, tenancyLabel } from './invoiceWorkflowLogic'
import type { TenancyOptionRow } from './rentInvoicesQueries'

interface NewInvoicePanelProps {
  tenancies: TenancyOptionRow[]
  busy: boolean
  onOpenPicker: () => void
  checkBlockers: (leaseId: string, periodStart: string) => Promise<{ codes: string[]; info: BlockerInfo[] }>
  onSave: (leaseId: string, periodStart: string, manualAmount: number | null) => void
  onCancel: () => void
}

// Draft one tenancy's invoice for a month from its structured records.
// Missing information is listed with where to fix it — never guessed.
export function NewInvoicePanel({ tenancies, busy, onOpenPicker, checkBlockers, onSave, onCancel }: NewInvoicePanelProps) {
  const [leaseId, setLeaseId] = useState<string | null>(null)
  const [month, setMonth] = useState(nextMonth(new Date()))
  const [check, setCheck] = useState<{ codes: string[]; info: BlockerInfo[] } | null>(null)
  const [manualAmount, setManualAmount] = useState('')
  const period = periodFromMonth(month)
  const tenancy = tenancies.find((t) => t.id === leaseId)

  useEffect(() => {
    let current = true
    setCheck(null)
    if (leaseId && period) checkBlockers(leaseId, period).then((r) => current && setCheck(r))
    return () => {
      current = false
    }
    // checkBlockers is stable per account; re-run only when the choice changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaseId, period])

  const needsManual = check?.codes.includes('prorate_manual') ?? false
  const hardBlockers = check?.info.filter((_, i) => check.codes[i] !== 'prorate_manual') ?? []
  const manual = needsManual ? Number(manualAmount) : null
  const canSave = !!leaseId && !!period && check !== null && hardBlockers.length === 0 && (!needsManual || (manualAmount.trim() !== '' && Number.isFinite(manual) && (manual ?? -1) >= 0))

  const fixLink = (code: string) => {
    if (!tenancy) return null
    if (code === 'billing_entity') return `/properties/${tenancy.property_id}`
    const tenant = tenancy.lease_tenants.find((lt) => lt.tenant)?.tenant
    return tenant ? `/tenants/${tenant.id}` : `/properties/${tenancy.property_id}`
  }

  return (
    <section className="card invoice-new-panel" aria-label="New invoice">
      <h2 className="property-details-title">New invoice</h2>
      <form onSubmit={(e) => { e.preventDefault(); if (canSave && leaseId && period) onSave(leaseId, period, manual) }}>
        <label>Tenancy<span className="required-marker">*</span></label>
        <SearchableSelect
          options={tenancies.map((t) => ({ id: t.id, label: tenancyLabel(t) }))}
          value={leaseId}
          onChange={setLeaseId}
          onOpen={onOpenPicker}
          placeholder="Choose a tenancy"
        />
        <label htmlFor="invoice-new-month">Billing month<span className="required-marker">*</span></label>
        <input id="invoice-new-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} required />

        {check && check.info.length > 0 && (
          <ul className="invoice-blockers">
            {check.info.map((b, i) => {
              const link = b.home ? fixLink(check.codes[i]) : null
              return (
                <li key={check.codes[i]} className={b.missingInformation ? 'invoice-blocker invoice-blocker--missing' : 'invoice-blocker'}>
                  <span>{b.message}</span>
                  {b.home && link && <Link to={link}>Fix in {b.home}</Link>}
                </li>
              )
            })}
          </ul>
        )}
        {check && check.info.length === 0 && <p className="field-hint">Ready: the draft uses the tenancy’s rent, due day and invoice issuer.</p>}

        {needsManual && (
          <>
            <label htmlFor="invoice-new-manual">Partial-month rent ($)<span className="required-marker">*</span></label>
            <input id="invoice-new-manual" inputMode="decimal" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} />
          </>
        )}

        <div className="invoice-form-actions">
          <button type="submit" disabled={!canSave || busy}>Save</button>
          <button type="button" onClick={onCancel}>Cancel</button>
        </div>
        <p className="field-hint">Saving creates a draft only. Nothing is numbered, issued or sent.</p>
      </form>
    </section>
  )
}
