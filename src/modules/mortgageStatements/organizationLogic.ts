import type { StatementDocument, StatementMetadata } from './statementTypes'
import { validStatementDate } from './statementLogic'
export function validateMetadata(v:StatementMetadata){
 if(!v.displayName.trim()||v.displayName.trim().length>255)throw Error('Enter a label of 1–255 characters.')
 if(!v.mortgageId)throw Error('Choose a loan.')
 for(const d of [v.statementDate,v.periodStart,v.periodEnd])if(d&&!validStatementDate(d))throw Error('Enter valid dates as printed on the statement.')
 if(Boolean(v.periodStart)!==Boolean(v.periodEnd))throw Error('Enter both period dates, or leave both blank.')
 if(v.periodStart&&v.periodEnd&&v.periodStart>v.periodEnd)throw Error('The period end must be on or after its start.')
}
export function needsDetails(d:StatementDocument){return !d.statementDate||!d.periodStart||!d.periodEnd}
export function filterStatements(docs:StatementDocument[],search:string,status:string,year:string){
 const q=search.trim().toLowerCase()
 return docs.filter(d=>(!q||`${d.displayName} ${d.originalFilename} ${d.statementDate??''}`.toLowerCase().includes(q))&&
 (year==='all'||d.statementDate?.startsWith(year))&&(status==='all'||status==='needs'&&needsDetails(d)||status==='ready'&&!needsDetails(d)&&d.loanStatus==='needs_review'||status==='reconciled'&&d.loanStatus==='reconciled'||status==='recheck'&&d.loanStatus==='needs_recheck'))
}
// Only between supplied, confirmed periods. Never assumes monthly cadence,
// loan inception, missing leading/trailing history, or a zero difference.
export function coverageGaps(docs:StatementDocument[]){
 const periods=docs.filter(d=>(d.documentKind??'statement')==='statement'&&d.periodStart&&d.periodEnd).sort((a,b)=>a.periodStart!.localeCompare(b.periodStart!))
 const gaps:{start:string;end:string}[]=[];let end:string|null=null
 const shift=(date:string,days:number)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
 for(const d of periods){if(end&&d.periodStart!>shift(end,1))gaps.push({start:shift(end,1),end:shift(d.periodStart!,-1)});if(!end||d.periodEnd!>end)end=d.periodEnd!}
 return gaps
}
export function statementError(e:unknown){return e&&typeof e==='object'&&'message' in e?String(e.message):'Unable to save. Your entries are kept; try again.'}
