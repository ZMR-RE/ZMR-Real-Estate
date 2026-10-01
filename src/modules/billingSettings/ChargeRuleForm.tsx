import { useState } from 'react'
import { KIND_LABEL, ruleFormFrom, validateRule, type RuleFormValues } from './chargeRulesLogic'
import type { ChargeRuleKind, ChargeRuleRow } from './chargeRulesQueries'

interface ChargeRuleFormProps {
  rule: ChargeRuleRow | null
  kind: ChargeRuleKind
  saving: boolean
  onSave: (values: RuleFormValues) => Promise<boolean>
  onCancel: () => void
}

// Add or change one billing rule. Only the fields the rule's kind uses are
// shown; required ones are marked and enforced.
export function ChargeRuleForm({ rule, kind, saving, onSave, onCancel }: ChargeRuleFormProps) {
  const [v, setV] = useState<RuleFormValues>(() => ruleFormFrom(rule, kind))
  const [touched, setTouched] = useState(false)
  const errors = validateRule(v)
  const id = rule?.id ?? `new-${kind}`
  const k = v.kind

  return (
    <form
      className="billing-form charge-rule-form"
      onSubmit={async (e) => {
        e.preventDefault()
        setTouched(true)
        if (errors.length === 0 && (await onSave(v))) onCancel()
      }}
    >
      <p className="property-field-group-title">{rule ? `Change: ${rule.description}` : `New ${KIND_LABEL[k].toLowerCase()}`}</p>
      <label htmlFor={`desc-${id}`}>Description<span className="required-marker">*</span></label>
      <input id={`desc-${id}`} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} placeholder={k === 'variable_statement' ? 'e.g. Gas' : k === 'one_time' ? 'e.g. Filter credit' : 'e.g. Pest control'} />
      <p className="field-hint">Printed as the invoice line.</p>

      {k !== 'variable_statement' && (
        <>
          <label htmlFor={`amt-${id}`}>{k === 'one_time' ? 'Amount (negative for a credit)' : 'Amount each month'}<span className="required-marker">*</span></label>
          <input id={`amt-${id}`} inputMode="decimal" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} />
        </>
      )}
      {k === 'fixed_recurring' && (
        <>
          <label htmlFor={`basis-${id}`}>Full monthly cost</label>
          <input id={`basis-${id}`} inputMode="decimal" value={v.basisTotal} onChange={(e) => setV({ ...v, basisTotal: e.target.value })} />
          <label htmlFor={`fshare-${id}`}>Tenant’s share (%)</label>
          <input id={`fshare-${id}`} inputMode="decimal" value={v.sharePercent} onChange={(e) => setV({ ...v, sharePercent: e.target.value })} />
          <p className="field-hint">Optional — shows on the invoice as “(50% of $120.00)”. The amount above is what’s charged.</p>
        </>
      )}
      {k === 'variable_statement' && (
        <>
          <label htmlFor={`share-${id}`}>Tenant’s share (%)<span className="required-marker">*</span></label>
          <input id={`share-${id}`} inputMode="decimal" value={v.sharePercent} onChange={(e) => setV({ ...v, sharePercent: e.target.value })} />
          <p className="field-hint">Billed only from a statement you enter for each month. A missing statement stays flagged — it’s never estimated.</p>
        </>
      )}
      {k === 'one_time' ? (
        <>
          <label htmlFor={`month-${id}`}>Billed in<span className="required-marker">*</span></label>
          <input id={`month-${id}`} type="month" value={v.oneTimeMonth} onChange={(e) => setV({ ...v, oneTimeMonth: e.target.value })} />
        </>
      ) : (
        <>
          <label htmlFor={`from-${id}`}>Starts</label>
          <input id={`from-${id}`} type="date" value={v.effectiveFrom} onChange={(e) => setV({ ...v, effectiveFrom: e.target.value })} />
          <label htmlFor={`to-${id}`}>Ends</label>
          <input id={`to-${id}`} type="date" value={v.effectiveTo} onChange={(e) => setV({ ...v, effectiveTo: e.target.value })} />
          <p className="field-hint">Blank start: from the first invoice drafted. Blank end: until you end it — it’s flagged for review when the tenancy ends.</p>
        </>
      )}
      <label htmlFor={`notes-${id}`}>Internal note</label>
      <textarea id={`notes-${id}`} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
      <p className="field-hint">Never printed.</p>

      {touched && errors.length > 0 && <ul className="billing-errors" role="alert">{errors.map((er) => <li key={er}>{er}</li>)}</ul>}
      <div className="billing-actions">
        <button type="submit" disabled={saving}>Save</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
