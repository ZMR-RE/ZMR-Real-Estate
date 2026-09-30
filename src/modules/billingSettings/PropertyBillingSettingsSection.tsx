import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../shared/auth/AuthContext'
import { EditableSection } from '../../shared/EditableSection'
import './billingSettings.css'
import { getPropertyBillingEntity, listBillingEntities, setPropertyBillingEntity, type EntityOption } from './billingSettingsQueries'

interface PropertyBillingSettingsSectionProps {
  propertyId: string
}

// Property → Billing settings (RP2): the EXPLICIT invoicing entity for this
// property's rent invoices. Chosen by the owner — never taken from the
// ownership interests, even when there is a single owner.
export function PropertyBillingSettingsSection({ propertyId }: PropertyBillingSettingsSectionProps) {
  const { accountId } = useAuth()
  const [entityId, setEntityId] = useState<string | null>(null)
  const [entities, setEntities] = useState<EntityOption[]>([])
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!accountId) return
    const [p, e] = await Promise.all([getPropertyBillingEntity(propertyId), listBillingEntities(accountId)])
    if (p.error) return setError(p.error.message)
    setEntityId(p.data?.billing_entity_id ?? null)
    setEntities(e.data ?? [])
  }, [accountId, propertyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const entity = entities.find((e) => e.id === entityId)

  const view = entity ? (
    <>
      {!entity.invoice_code && (
        <p className="billing-callout">This entity has no invoice code yet, so its invoices can be drafted but not issued. <Link to={`/entities/${entity.id}`}>Add it under Invoicing on the entity profile</Link>.</p>
      )}
      <dl className="field-grid">
        <div className="field">
          <dt>Invoicing entity</dt>
          <dd><Link to={`/entities/${entity.id}`}>{entity.display_name || entity.name}</Link></dd>
        </div>
        {entity.invoice_code && <div className="field"><dt>Invoice code</dt><dd>{entity.invoice_code}</dd></div>}
      </dl>
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
        const r = await setPropertyBillingEntity(propertyId, draft || null)
        setSaving(false)
        if (r.error) return setError(r.error.message)
        setError(null)
        await refresh()
        exit()
      }}
    >
      <label htmlFor={`billing-entity-${propertyId}`}>Invoicing entity</label>
      <select id={`billing-entity-${propertyId}`} value={draft} onChange={(e) => setDraft(e.target.value)}>
        <option value="">Not chosen</option>
        {entities.map((e) => <option key={e.id} value={e.id}>{e.display_name || e.name}{e.invoice_code ? ` (${e.invoice_code})` : ''}</option>)}
      </select>
      <p className="field-hint">The entity named on this property’s rent invoices. Choose it explicitly — it isn’t taken from the ownership list. Already-issued invoices keep the entity they were issued by.</p>
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
        setDraft(entityId ?? '')
        refresh()
      }}
    />
  )
}
