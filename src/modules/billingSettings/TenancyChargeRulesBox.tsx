import { useState } from 'react'
import { EditableSection } from '../../shared/EditableSection'
import { ChargeRuleForm } from './ChargeRuleForm'
import { KIND_LABEL, money, monthLabel, ruleDates, ruleLocked, ruleSummary } from './chargeRulesLogic'
import type { ChargeRuleKind, ChargeRuleRow } from './chargeRulesQueries'
import { StatementForm } from './StatementForm'
import { useChargeRules } from './useChargeRules'

interface TenancyChargeRulesBoxProps {
  leaseId: string
  propertyId: string
  where: string
}

type Editing = { kind: 'rule'; rule: ChargeRuleRow | null; ruleKind: ChargeRuleKind } | { kind: 'statement'; rule: ChargeRuleRow } | null

// Tenancy → Billing rules: charges that recur or repeat on this tenancy's
// invoices — structured settings, not assistant instructions. Invoice
// drafting (owner or assistant) adds them as lines; each is billed at most
// once per month, and a variable bill only from an entered statement.
export function TenancyChargeRulesBox({ leaseId, propertyId, where }: TenancyChargeRulesBoxProps) {
  const c = useChargeRules(leaseId, propertyId)
  const [editing, setEditing] = useState<Editing>(null)
  const reviewCount = Object.keys(c.review).length

  const flags = (
    <>
      {c.error && <p className="billing-callout billing-callout--error" role="alert">{c.error}</p>}
      {c.unresolved.map((u) => (
        <p key={u.rule_id} className="billing-callout" role="note">
          No {monthLabel(u.service_period_start)} statement for {u.description} yet — it won’t be on next month’s invoice until you enter it (Edit).
        </p>
      ))}
    </>
  )

  const ruleItem = (r: ChargeRuleRow, actions?: React.ReactNode) => (
    <li key={r.id} className={c.review[r.id] ? 'charge-rule charge-rule--review' : 'charge-rule'}>
      <span className="charge-rule-main">
        <strong>{r.description}</strong> — {ruleSummary(r)}
        {ruleDates(r) && <span className="field-hint"> · {ruleDates(r)}</span>}
      </span>
      {c.review[r.id] && <span className="charge-rule-flag">{c.review[r.id]}</span>}
      {ruleLocked(r) && <span className="field-hint">On an invoice — change it there, or reject that draft first.</span>}
      {r.kind === 'variable_statement' && r.tenancy_charge_statements.length > 0 && (
        <ul className="charge-rule-statements">
          {[...r.tenancy_charge_statements].sort((a, b) => b.service_period_start.localeCompare(a.service_period_start)).map((s) => (
            <li key={s.id}>
              {monthLabel(s.service_period_start)} statement: {money(Number(s.statement_amount))} → {money(Math.round(Number(s.statement_amount) * Number(r.share_percent)) / 100)}
              {s.billed_invoice_id ? ' · on an invoice' : ' · not billed yet'}
              {!s.document_id && <span className="field-hint"> · no statement document linked</span>}
            </li>
          ))}
        </ul>
      )}
      {actions}
    </li>
  )

  const view =
    c.rules.length === 0 ? (
      <p className="field-hint">No billing rules. Rent comes from the lease; add recurring or one-time charges here (Edit).</p>
    ) : (
      <>
        {flags}
        <ul className="charge-rule-list">{c.rules.map((r) => ruleItem(r))}</ul>
      </>
    )

  const edit = (exit: () => void) => (
    <div className="billing-form">
      {flags}
      <ul className="charge-rule-list">
        {c.rules.map((r) =>
          ruleItem(
            r,
            <span className="billing-actions charge-rule-actions">
              {r.kind === 'variable_statement' && (
                <button type="button" onClick={() => setEditing({ kind: 'statement', rule: r })}>Enter statement</button>
              )}
              {!ruleLocked(r) && <button type="button" onClick={() => setEditing({ kind: 'rule', rule: r, ruleKind: r.kind })}>Change</button>}
              <button type="button" disabled={c.saving} onClick={() => c.endRule(r)}>End rule</button>
            </span>,
          ),
        )}
      </ul>
      {editing?.kind === 'rule' && (
        <ChargeRuleForm key={editing.rule?.id ?? editing.ruleKind} rule={editing.rule} kind={editing.ruleKind} saving={c.saving} onSave={(v) => c.saveRule(editing.rule, v)} onCancel={() => setEditing(null)} />
      )}
      {editing?.kind === 'statement' && (
        <StatementForm rule={editing.rule} documents={c.documents} saving={c.saving} onSave={(m, a, d) => c.addStatement(editing.rule, m, a, d)} onCancel={() => setEditing(null)} />
      )}
      {!editing && (
        <div className="billing-actions">
          {(Object.keys(KIND_LABEL) as ChargeRuleKind[]).map((k) => (
            <button key={k} type="button" onClick={() => setEditing({ kind: 'rule', rule: null, ruleKind: k })}>Add {KIND_LABEL[k].toLowerCase()}</button>
          ))}
        </div>
      )}
      <p className="field-hint">Ending a rule keeps it — and anything already billed from it — on record. Changes apply to invoices drafted afterwards; drafts already made keep their lines.</p>
      <div className="billing-actions">
        <button type="button" onClick={() => { setEditing(null); exit() }}>Done</button>
      </div>
    </div>
  )

  return (
    <EditableSection
      title={`Billing rules — ${where}${reviewCount > 0 ? ` · ${reviewCount} to review` : ''}`}
      defaultOpen={c.rules.length > 0}
      view={view}
      edit={edit}
      onEditStart={() => {
        setEditing(null)
        c.loadDocuments()
      }}
    />
  )
}
