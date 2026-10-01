import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EditableSection } from '../../shared/EditableSection'
import './billingSettings.css'
import { continuityChoices, continuityLabel, dueDayLabel, PRORATE_LABEL, termsFormFrom, validateTerms, type TermsFormValues } from './billingSettingsLogic'
import { termsOf, type ContinuityOption, type TenancyRow } from './billingSettingsQueries'
import { TenancyChargeRulesBox } from './TenancyChargeRulesBox'
import { useTenancyBilling } from './useTenancyBilling'

const MONEY = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

interface TenancyBillingSectionProps {
  tenantId: string
}

// Tenant profile → Tenancy & billing (RP1). One box per current tenancy.
// Rent is shown from the lease (the lease owns it); the billing-specific
// terms and recipients are edited here. One charge per tenancy and month —
// co-tenants share it.
export function TenancyBillingSection({ tenantId }: TenancyBillingSectionProps) {
  const { tenancies, loading, error, saving, save, continuityOptions, loadContinuityOptions } = useTenancyBilling(tenantId)
  if (loading) return null
  if (tenancies.length === 0) return null

  return (
    <>
      {error && <p className="billing-callout billing-callout--error" role="alert">{error}</p>}
      {tenancies.map((t) => (
        <div key={t.id}>
          <TenancyBillingBox key={`${t.id}-${termsOf(t)?.version ?? 0}`} tenancy={t} saving={saving} onSave={save} continuityOptions={continuityOptions} onEditStart={loadContinuityOptions} />
          <TenancyChargeRulesBox leaseId={t.id} propertyId={t.property_id} where={`${t.property?.address ?? 'Property'} — ${t.unit?.unit_label ?? 'Unit'}`} />
        </div>
      ))}
    </>
  )
}

interface BoxProps {
  tenancy: TenancyRow
  saving: boolean
  onSave: (t: TenancyRow, v: TermsFormValues, recipients: Record<string, boolean>) => Promise<boolean>
  continuityOptions: ContinuityOption[]
  onEditStart: () => void
}

function TenancyBillingBox({ tenancy: t, saving, onSave, continuityOptions, onEditStart }: BoxProps) {
  const terms = termsOf(t)
  const [values, setValues] = useState<TermsFormValues>(() => termsFormFrom(terms))
  const [recipients, setRecipients] = useState<Record<string, boolean>>(() => Object.fromEntries(t.lease_tenants.map((lt) => [lt.id, lt.is_billing_recipient])))
  const [touched, setTouched] = useState(false)
  const errors = validateTerms(values)
  const where = `${t.property?.address ?? 'Property'} — ${t.unit?.unit_label ?? 'Unit'}`
  const recipientNames = t.lease_tenants.filter((lt) => lt.is_billing_recipient).map((lt) => lt.tenant?.name).filter(Boolean)
  const missing = [
    t.rent_amount == null && 'No rent amount on the lease.',
    !terms?.due_day && 'No rent due day set.',
    recipientNames.length === 0 && 'No billing recipient chosen.',
  ].filter(Boolean) as string[]

  const view = (
    <>
      {missing.length > 0 && (
        <div className="billing-callout" role="note">
          <strong>Needed before invoices can be drafted:</strong>
          <ul>{missing.map((m) => <li key={m}>{m}</li>)}</ul>
          {t.rent_amount == null && <Link to={`/properties/${t.property_id}`}>Set the rent on the lease (Property › Units)</Link>}
        </div>
      )}
      <dl className="field-grid">
        {t.rent_amount != null && <div className="field"><dt>Rent (from the lease)</dt><dd>{MONEY.format(Number(t.rent_amount))} monthly</dd></div>}
        {terms?.due_day != null && <div className="field"><dt>Due</dt><dd>{dueDayLabel(terms.due_day)}</dd></div>}
        {recipientNames.length > 0 && <div className="field"><dt>Billed to</dt><dd>{recipientNames.join(' & ')}</dd></div>}
        {terms && <div className="field"><dt>Partial months</dt><dd>{PRORATE_LABEL[terms.prorate_rule]}</dd></div>}
        {terms?.effective_from && <div className="field"><dt>Bill from</dt><dd>{terms.effective_from}</dd></div>}
        {terms?.effective_to && <div className="field"><dt>Bill until</dt><dd>{terms.effective_to}</dd></div>}
        {terms?.prorate_notes && <div className="field"><dt>Prorating notes</dt><dd>{terms.prorate_notes}</dd></div>}
        {terms?.continues_lease_id && (
          <div className="field">
            <dt>Billing continues from</dt>
            <dd>{(() => { const o = continuityOptions.find((x) => x.id === terms.continues_lease_id); return o ? continuityLabel(o) : 'An earlier tenancy' })()}</dd>
          </div>
        )}
      </dl>
    </>
  )

  const edit = (exit: () => void) => (
    <form
      className="billing-form"
      onSubmit={async (e) => {
        e.preventDefault()
        setTouched(true)
        if (errors.length === 0 && (await onSave(t, values, recipients))) exit()
      }}
    >
      <label htmlFor={`due-${t.id}`}>Rent due day<span className="required-marker">*</span></label>
      <select id={`due-${t.id}`} value={values.dueDay} onChange={(e) => setValues({ ...values, dueDay: e.target.value })}>
        <option value="">Choose…</option>
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{dueDayLabel(d)}</option>)}
      </select>

      <fieldset className="billing-fieldset">
        <legend>Billing recipients</legend>
        {t.lease_tenants.map((lt) => (
          <label key={lt.id}>
            <input type="checkbox" checked={!!recipients[lt.id]} onChange={(e) => setRecipients({ ...recipients, [lt.id]: e.target.checked })} />
            {lt.tenant?.name}{lt.tenant?.email ? ` (${lt.tenant.email})` : ''}
          </label>
        ))}
        <p className="field-hint">One invoice per month for the tenancy, addressed to everyone ticked.</p>
      </fieldset>

      <label htmlFor={`prorate-${t.id}`}>Partial months</label>
      <select id={`prorate-${t.id}`} value={values.prorateRule} onChange={(e) => setValues({ ...values, prorateRule: e.target.value as TermsFormValues['prorateRule'] })}>
        {(Object.keys(PRORATE_LABEL) as TermsFormValues['prorateRule'][]).map((k) => <option key={k} value={k}>{PRORATE_LABEL[k]}</option>)}
      </select>
      <label htmlFor={`pnotes-${t.id}`}>Prorating notes</label>
      <textarea id={`pnotes-${t.id}`} value={values.prorateNotes} onChange={(e) => setValues({ ...values, prorateNotes: e.target.value })} />

      <label htmlFor={`from-${t.id}`}>Bill from</label>
      <input id={`from-${t.id}`} type="date" value={values.effectiveFrom} onChange={(e) => setValues({ ...values, effectiveFrom: e.target.value })} />
      <label htmlFor={`to-${t.id}`}>Bill until</label>
      <input id={`to-${t.id}`} type="date" value={values.effectiveTo} onChange={(e) => setValues({ ...values, effectiveTo: e.target.value })} />
      <p className="field-hint">Leave blank to follow the lease’s start ({t.start_date}) and end{t.end_date ? ` (${t.end_date})` : ''} dates.</p>

      <label htmlFor={`cont-${t.id}`}>Billing continues from</label>
      <select id={`cont-${t.id}`} value={values.continuesLeaseId} onChange={(e) => setValues({ ...values, continuesLeaseId: e.target.value })}>
        <option value="">Not a continuation</option>
        {continuityChoices(continuityOptions, t.id, t.start_date).map((o) => <option key={o.id} value={o.id}>{continuityLabel(o)}</option>)}
      </select>
      <p className="field-hint">
        Only for a renewal or other continuation of the same billing relationship. When set, this tenancy’s invoices list that tenancy’s unpaid invoices from the same entity as earlier balances — never as new charges — and include them once in the total outstanding. Nothing is linked automatically; if the billed tenants differ, the balance is flagged for your review instead of counted.
      </p>

      {touched && errors.length > 0 && <ul className="billing-errors" role="alert">{errors.map((er) => <li key={er}>{er}</li>)}</ul>}
      <div className="billing-actions">
        <button type="submit" disabled={saving}>Save</button>
        <button type="button" onClick={exit}>Cancel</button>
      </div>
    </form>
  )

  const reset = () => {
    setValues(termsFormFrom(terms))
    setRecipients(Object.fromEntries(t.lease_tenants.map((lt) => [lt.id, lt.is_billing_recipient])))
    setTouched(false)
  }

  return (
    <EditableSection
      title={`Tenancy & billing — ${where}`}
      defaultOpen
      view={view}
      edit={edit}
      onEditStart={() => {
        reset()
        onEditStart()
      }}
    />
  )
}
