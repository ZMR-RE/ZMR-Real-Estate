import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthContext'
import { EditableSection } from '../../shared/EditableSection'
import './billingSettings.css'
import { effectivePaymentInstructions } from './billingSettingsLogic'
import {
  getEntityDefaultPaymentInstructions,
  getPropertyBilling,
  listBillingEntities,
  setPropertyBilling,
  type EntityOption,
  type PropertyBillingRow,
} from './billingSettingsQueries'

interface PropertyBillingSettingsSectionProps {
  propertyId: string
}

// Property → Billing settings (RP2): the EXPLICIT invoicing entity for this
// property's rent invoices — chosen by the owner, never taken from the
// ownership interests — and, optionally, this property's own payment
// instructions. Without its own, the property inherits the entity's default
// (Branding & documents); the box says which applies.
export function PropertyBillingSettingsSection({ propertyId }: PropertyBillingSettingsSectionProps) {
  const { accountId } = useAuth()
  const [row, setRow] = useState<PropertyBillingRow | null>(null)
  const [entities, setEntities] = useState<EntityOption[]>([])
  const [entityDefault, setEntityDefault] = useState<string | null>(null)
  const [draft, setDraft] = useState({ entityId: '', override: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Entity defaults are owned by Branding & documents, so they're re-read
  // whenever this box loads or enters Edit (cross-module freshness).
  const refresh = useCallback(async () => {
    if (!accountId) return
    const [p, e] = await Promise.all([getPropertyBilling(propertyId), listBillingEntities(accountId)])
    if (p.error) return setError(p.error.message)
    setRow(p.data)
    setEntities(e.data ?? [])
    const d = p.data?.billing_entity_id ? await getEntityDefaultPaymentInstructions(p.data.billing_entity_id) : null
    setEntityDefault(d?.data?.payment_instructions ?? null)
  }, [accountId, propertyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const entity = entities.find((e) => e.id === row?.billing_entity_id)
  const entityName = entity ? entity.display_name || entity.name : null
  const effective = effectivePaymentInstructions(row?.payment_instructions_override ?? null, entityDefault, entityName)

  const view = entity ? (
    <>
      {!entity.invoice_code && (
        <p className="billing-callout">This entity has no invoice code yet, so its invoices can be drafted but not issued. <Link to={`/entities/${entity.id}`}>Add it under Invoicing on the entity profile</Link>.</p>
      )}
      <dl className="field-grid">
        <div className="field">
          <dt>Invoicing entity</dt>
          <dd><Link to={`/entities/${entity.id}`}>{entityName}</Link></dd>
        </div>
        {entity.invoice_code && <div className="field"><dt>Invoice code</dt><dd>{entity.invoice_code}</dd></div>}
        {effective.text && (
          <div className="field">
            <dt>Payment instructions</dt>
            <dd>
              {effective.text}
              <span className="field-hint billing-source">{effective.source}</span>
            </dd>
          </div>
        )}
      </dl>
      {!effective.text && (
        <p className="billing-callout">
          No payment instructions — add a default in <Link to={`/settings?tab=entities&entity=${entity.id}`}>{entityName}’s Branding &amp; documents</Link>, or this property’s own (Edit).
        </p>
      )}
    </>
  ) : (
    <p className="billing-callout">No invoicing entity chosen — rent invoices for this property can’t be drafted until you choose one.</p>
  )

  const edit = (exit: () => void) => (
    <form
      className="billing-form"
      onSubmit={async (e) => {
        e.preventDefault()
        setSaving(true)
        const r = await setPropertyBilling(propertyId, { billing_entity_id: draft.entityId || null, payment_instructions_override: draft.override.trim() || null })
        setSaving(false)
        if (r.error) return setError(r.error.message)
        setError(null)
        await refresh()
        exit()
      }}
    >
      <label htmlFor={`billing-entity-${propertyId}`}>Invoicing entity</label>
      <select id={`billing-entity-${propertyId}`} value={draft.entityId} onChange={(e) => setDraft({ ...draft, entityId: e.target.value })}>
        <option value="">Not chosen</option>
        {entities.map((e) => <option key={e.id} value={e.id}>{e.display_name || e.name}{e.invoice_code ? ` (${e.invoice_code})` : ''}</option>)}
      </select>
      <p className="field-hint">The entity named on this property’s rent invoices. Choose it explicitly — it isn’t taken from the ownership list. Already-issued invoices keep the entity they were issued by.</p>

      <label htmlFor={`billing-pay-${propertyId}`}>This property’s payment instructions</label>
      <textarea id={`billing-pay-${propertyId}`} value={draft.override} onChange={(e) => setDraft({ ...draft, override: e.target.value })} />
      <p className="field-hint">
        {draft.entityId && draft.entityId === row?.billing_entity_id && entityDefault
          ? `Leave blank to use ${entityName}’s default: “${entityDefault}”.`
          : 'Leave blank to use the invoicing entity’s default (Branding & documents).'}{' '}
        An approved invoice that isn’t issued yet will need approving again; issued invoices keep the instructions they were issued with.
      </p>
      {error && <p className="billing-callout billing-callout--error" role="alert">{error}</p>}
      <div className="billing-actions">
        <button type="submit" disabled={saving}>Save</button>
        <button type="button" onClick={exit}>Cancel</button>
      </div>
    </form>
  )

  return (
    <EditableSection
      title="Billing settings"
      view={
        <>
          {error && <p className="billing-callout billing-callout--error" role="alert">{error}</p>}
          {view}
        </>
      }
      edit={edit}
      onEditStart={() => {
        setDraft({ entityId: row?.billing_entity_id ?? '', override: row?.payment_instructions_override ?? '' })
        refresh()
      }}
    />
  )
}
