import type { Allocation } from './reconciliationTypes'
import type { ReviewSource } from './workflowTypes'
import { cents } from './reconciliationLogic'
/** Never use a previously edited review as statement evidence. No rounding. */
export function statementAllocation(source:ReviewSource):Required<Allocation> {
 return {total:source.total,principal:source.principal,interest:source.interest,escrow:source.escrow,fees:source.fees??'0.00'}
}
export function differsFromStatement(source:ReviewSource,allocation:Allocation):boolean {
 const original=statementAllocation(source)
 return (Object.keys(original) as (keyof Allocation)[]).some(k=>cents(original[k],true)!==cents(allocation[k]??'0.00',true))
}
