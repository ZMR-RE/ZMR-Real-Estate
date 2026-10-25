import { useState } from 'react'
import { CollapsibleSection } from '../../shared/CollapsibleSection'
import { attentionGroups } from './reviewPresentation'
import type { ReviewIssue } from './workflowTypes'

export function ReviewAttention({issues}:{issues:ReviewIssue[]}) {
 const groups = attentionGroups(issues)
 if (!groups.length) return null
 return <CollapsibleSection title={`Needs attention · ${groups.reduce((n,g)=>n+g.issues.length,0)}`} defaultOpen>
  <div className="review-attention-groups">{groups.map(group=><section key={group.key}>
   <div className="review-attention-summary"><span>{group.label}</span><span className="status-badge">{group.issues.length}</span></div>
   {group.key==='statement_details'&&<AttentionDetails issues={group.issues}/>}
  </section>)}</div>
 </CollapsibleSection>
}
function AttentionDetails({issues}:{issues:ReviewIssue[]}) {
 const [page,setPage]=useState(0)
 const current=Math.min(page,Math.max(0,Math.ceil(issues.length/5)-1))
 return <details className="review-attention-details"><summary>View statements</summary>
  <ul>{issues.slice(current*5,current*5+5).map(i=><li key={i.id}>{i.message.replace(/: statement details need review\.$/,'')}</li>)}</ul>
  <div className="reconciliation-pager"><span>{current*5+1}–{Math.min((current+1)*5,issues.length)} of {issues.length}</span><div>
   <button type="button" disabled={!current} onClick={()=>setPage(current-1)}>Previous statements</button>
   <button type="button" disabled={(current+1)*5>=issues.length} onClick={()=>setPage(current+1)}>Next statements</button>
  </div></div>
 </details>
}
