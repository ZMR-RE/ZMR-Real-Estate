import { allocationCheck, cents, matchPayment, statementBridge, validateSource } from './reconciliationLogic'
import type { LoanDataset, ReviewCommand, ReviewState } from './workflowTypes'
export function completionProblems(data: LoanDataset, state: ReviewState, documentId: string): string[] {
 const problems:string[]=[]
 const ordered=[...data.statements].sort((a,b)=>a.date.localeCompare(b.date))
 const index=ordered.findIndex(s=>s.documentId===documentId), next=ordered[index]
 if(!next) return ['Statement not found.']
 if(!data.reference) problems.push('Confirm a dated balance reference first.')
 if(data.reference && next.date>data.reference.date) problems.push('This statement is after the balance reference; new activity needs a separate review.')
 if(state.issues.some(i=>!i.resolution)) problems.push('Resolve the open loan issues first.')
 const sources=data.activity.filter(a=>a.documentId===documentId)
 if(sources.some(s=>!state.reviews[s.sourceId])) problems.push('Review every activity line on this statement.')
 if(index<1) problems.push('An earlier statement or verified opening balance is needed for this first period.')
 else {
  try {
   const rows=sources.map(s=>({...s,...state.reviews[s.sourceId]?.allocation}))
   const check=statementBridge(data.scope,ordered[index-1],next,rows)
   if(!check.balancesMatch) problems.push(`Balance differences: principal $${check.principalDifference}; escrow $${check.escrowDifference}.`)
   if(check.missingMonths) problems.push(`${check.missingMonths} statement month(s) are missing.`)
  }catch(e){problems.push((e as Error).message)}
 }
 return problems
}
export function transition(data:LoanDataset, current:ReviewState, command:ReviewCommand, reviewer:string, now:string, viewed:ReadonlySet<string>):ReviewState {
 if(!command||!['review','remove','issue','complete','reopen'].includes(command.kind)) throw new Error('Unsupported review action.')
 const state=structuredClone(current)
 if(command.kind==='reopen'){
  if(!state.completed[command.documentId]||!command.note.trim())throw new Error('Choose a completed review and explain why it needs reopening.')
  delete state.completed[command.documentId]
 } else if(command.kind==='issue') {
  const issue=state.issues.find(i=>i.id===command.id)
  if(!issue||issue.locked) throw new Error('This issue requires supporting evidence; it cannot be dismissed here.')
  if(!command.resolution.trim()) throw new Error('Record how this issue was resolved.')
  issue.resolution=command.resolution.trim()
 } else if(command.kind==='complete') {
  const problems=completionProblems(data,state,command.documentId)
  if(problems.length) throw new Error(problems.join(' '))
  if(!viewed.has(command.documentId)) throw new Error('Open this statement before completing its review.')
  if(!command.note.trim()) throw new Error('Record the reconciliation outcome.')
  if(state.completed[command.documentId]) throw new Error('This statement is already reconciled.')
  state.completed[command.documentId]={reviewer,at:now,note:command.note.trim()}
  const date=data.statements.find(s=>s.documentId===command.documentId)!.date
  const [y,m]=date.split('-').map(Number)
  const cycle=`${m===12?y+1:y}-${String(m===12?1:m+1).padStart(2,'0')}`
  if(!data.statements.some(s=>s.date.startsWith(cycle))&&!state.nextCycles.includes(cycle)) state.nextCycles.push(cycle)
 } else {
  const source=data.activity.find(a=>a.sourceId===command.sourceId)
  if(!source) throw new Error('Source line not found.')
  if(state.completed[source.documentId]) throw new Error('Completed reviews are read-only. Reopening requires a separately audited workflow.')
  if(command.kind==='remove') {delete state.reviews[source.sourceId]}
  else {
   if(!command.confirmed||!viewed.has(source.documentId)) throw new Error('Open the source statement and confirm the allocation first.')
   const a=command.allocation
   if(!a||Object.keys(a).some(k=>!['total','principal','interest','escrow','fees'].includes(k))||['total','principal','interest','escrow'].some(k=>typeof a[k as keyof typeof a]!=='string')||typeof command.reason!=='string') throw new Error('Invalid allocation fields.')
   const values={...source,total:a.total,principal:a.principal,interest:a.interest,escrow:a.escrow,fees:a.fees??'0.00'}
   validateSource(data.scope,values)
   const changed=(['total','principal','interest','escrow','fees'] as const).some(k=>cents(source[k]??'0',true)!==cents(values[k]??'0',true))
   if(changed&&!command.reason.trim()) throw new Error('Explain the correction; the original statement values will be retained.')
   if(source.kind==='payment'||source.kind==='principal') {
    if(!allocationCheck(values).valid) throw new Error('The allocation must equal the total.')
   }
   if(source.kind==='reversal') {
    const original=data.activity.find(s=>s.sourceId===command.reversalOf)
    if(!original||!['payment','principal'].includes(original.kind)||original.postedDate>source.postedDate||cents(original.principal)!==-cents(values.principal,true)) throw new Error('Link this reversal to its original principal allocation with the same amount.')
   } else if(command.reversalOf) throw new Error('Only a reversal can link an original allocation.')
   const match=matchPayment(data.scope,values,data.existing)
   if(match.status==='conflict') throw new Error(match.message)
   const collisions=Object.values(state.reviews).filter(r=>r.sourceId!==source.sourceId&&r.original.postedDate===source.postedDate&&['payment','principal'].includes(source.kind)&&['payment','principal'].includes(r.original.kind)&&cents(r.allocation.total)===cents(values.total))
   if(collisions.length && (command.duplicateAck!==collisions.length || !command.reason.trim())) throw new Error(`Compare the ${collisions.length} other reviewed same-date, same-total entry before confirming these are separate statement entries.`)
   if(!collisions.length&&command.duplicateAck) throw new Error('The matching review count changed. Review the comparison again.')
   state.reviews[source.sourceId]={sourceId:source.sourceId,original:structuredClone(source),allocation:{total:values.total,principal:values.principal,interest:values.interest,escrow:values.escrow,fees:values.fees??'0.00'},reason:command.reason.trim(),reversalOf:command.reversalOf,action:match.status==='matched'?'retain_existing':source.kind==='reversal'||source.kind==='escrow_disbursement'?'review_adjustment':'review_payment',existingId:match.existingId,reviewer,reviewedAt:now,duplicateAck:collisions.length||undefined}
  }
 }
 state.revision++
 return state
}
