import { useState } from 'react'
import { reviewDraft } from './reconciliationLogic'
import type { BalanceReference, DraftReview, ExistingPayment, LoanScope, SourceActivity } from './reconciliationTypes'
// Review-only local state. No database gateway is wired until its server contract is implemented and tested.
export function useReconciliationDraft(scope: LoanScope, existing: ExistingPayment[], reference: BalanceReference | null) {
  const [drafts, setDrafts] = useState<DraftReview[]>([]), [error, setError] = useState<string|null>(null)
  const save = (source:SourceActivity, confirmed:boolean) => {
    try {
      const draft = reviewDraft(scope,source,existing,reference,confirmed,drafts)
      setDrafts(previous=>previous.some(row=>row.sourceId===draft.sourceId)?previous:[...previous,draft])
      setError(null); return true
    } catch(e) {setError((e as Error).message);return false}
  }
  return { drafts, error, save, remove:(id:string)=>setDrafts(previous=>previous.filter(row=>row.sourceId!==id)), clearError:()=>setError(null) }
}
