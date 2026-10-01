import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { nextPeriod, ruleInputFrom, type RuleFormValues } from './chargeRulesLogic'
import {
  addChargeRule,
  addChargeStatement,
  listChargeRules,
  listPropertyDocuments,
  rulesNeedingReview,
  unresolvedVariableCharges,
  updateChargeRule,
  type ChargeRuleRow,
  type StatementDocumentOption,
} from './chargeRulesQueries'

type DbError = { code?: string; message: string } | null

const explain = (e: NonNullable<DbError>) =>
  e.code === 'PGRST116'
    ? 'This rule changed since you opened it. The latest is shown — review and edit again.'
    : e.code === '23505'
      ? 'A statement for that month is already entered for this rule.'
      : e.message

// Business logic for one tenancy's billing rules: load, add/change/end a
// rule (version-checked), enter a variable bill's statement, and the review
// signals — rules to review at lease end/renewal, and variable bills still
// missing a statement for next month's invoice (never estimated).
export function useChargeRules(leaseId: string, propertyId: string) {
  const { accountId } = useAuth()
  const [rules, setRules] = useState<ChargeRuleRow[]>([])
  const [review, setReview] = useState<Record<string, string>>({})
  const [unresolved, setUnresolved] = useState<{ rule_id: string; description: string; service_period_start: string }[]>([])
  const [documents, setDocuments] = useState<StatementDocumentOption[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const [r, f, u] = await Promise.all([listChargeRules(leaseId), rulesNeedingReview(leaseId), unresolvedVariableCharges(leaseId, nextPeriod(new Date()))])
    if (r.error) return setError(r.error.message)
    setRules(r.data ?? [])
    setReview(Object.fromEntries((f.data ?? []).map((x) => [x.rule_id, x.reason])))
    setUnresolved(u.data ?? [])
  }, [leaseId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Documents belong to the Documents module: re-read when Edit opens.
  const loadDocuments = async () => {
    const d = await listPropertyDocuments(propertyId)
    setDocuments(d.data ?? [])
  }

  const act = async (op: () => PromiseLike<{ error: DbError }>): Promise<boolean> => {
    setSaving(true)
    setError(null)
    const { error: e } = await op()
    setSaving(false)
    if (e) setError(explain(e))
    await refresh()
    return !e
  }

  const saveRule = (existing: ChargeRuleRow | null, values: RuleFormValues) =>
    accountId
      ? act(() => (existing ? updateChargeRule(existing.id, existing.version, ruleInputFrom(values)) : addChargeRule(accountId, leaseId, ruleInputFrom(values))))
      : Promise.resolve(false)

  // Ending keeps the rule and everything already billed from it (no delete).
  const endRule = (r: ChargeRuleRow) => act(() => updateChargeRule(r.id, r.version, { status: 'ended' }))

  const addStatement = (r: ChargeRuleRow, month: string, amount: number, documentId: string | null) =>
    accountId ? act(() => addChargeStatement(accountId, r.id, `${month}-01`, amount, documentId)) : Promise.resolve(false)

  return { rules, review, unresolved, documents, loadDocuments, saving, error, saveRule, endRule, addStatement }
}
