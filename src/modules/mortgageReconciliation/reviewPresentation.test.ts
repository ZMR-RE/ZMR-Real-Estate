import { describe,it,expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { attentionGroups,newestStatements } from './reviewPresentation'
import { ReviewAttention } from './ReviewAttention'
import type { ReviewIssue } from './workflowTypes'
describe('review presentation without changing blockers',()=>{
 it('groups 55 source details and repeated balance alerts without losing issue identities',()=>{
  const issues:ReviewIssue[]=[...Array.from({length:55},(_,i)=>({id:`d${i}`,message:`Statement ${i}: statement details need review.`,locked:true,category:'statement_details' as const})),...Array.from({length:3},(_,i)=>({id:`b${i}`,message:'Resolve principal in Action Queue.',locked:true})),{id:'done',message:'Resolved',locked:true,resolution:'Checked'}]
  const before=JSON.stringify(issues),groups=attentionGroups(issues)
  expect(groups.map(g=>g.issues.length)).toEqual([55,3]);expect(groups.flatMap(g=>g.issues).map(i=>i.id)).toHaveLength(58)
  expect(JSON.stringify(issues)).toBe(before)
  const html=renderToStaticMarkup(createElement(ReviewAttention,{issues}))
  expect(html).toContain('Needs attention · 58');expect(html.match(/<li>/g)).toHaveLength(5)
  expect(html).toContain('1–5 of 55');expect(html).not.toContain('Statement 5:')
  expect(html.match(/Resolve principal in Action Queue\./g)).toHaveLength(1)
 })
 it('keeps unknown and differently worded blockers visible',()=>{
  expect(attentionGroups([{id:'1',message:'Principal needs review',locked:true},{id:'2',message:'Escrow needs review',locked:true}])).toHaveLength(2)
 })
 it('sorts dates descending, missing dates last, ties deterministically, without mutating input',()=>{
  const docs=[{id:'n',displayName:'No date',statementDate:null},{id:'b',displayName:'B',statementDate:'2026-09-04'},{id:'old',displayName:'Old',statementDate:'2022-01-01'},{id:'a',displayName:'A',statementDate:'2026-09-04'}]
  expect(newestStatements(docs).map(d=>d.id)).toEqual(['a','b','old','n']);expect(docs[0].id).toBe('n')
 })
})
