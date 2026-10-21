import {expect,it} from 'vitest'
import {statementAllocation,differsFromStatement} from './statementAllocation'
import type {ReviewSource} from './workflowTypes'
const source:ReviewSource={accountId:'a',propertyId:'p',mortgageId:'m',sourceId:'s',documentId:'d',digest:'digest',line:1,statementDate:'2026-09-07',postedDate:'2026-09-04',kind:'payment',description:'Payment',total:'105.00',principal:'50.00',interest:'30.00',escrow:'25.00'}
it('restores all five statement components without altering the source or old allocation',()=>{
 const old={total:'105.00',principal:'51.00',interest:'29.00',escrow:'25.00',fees:'0.00'}
 expect(differsFromStatement(source,old)).toBe(true)
 expect(statementAllocation(source)).toEqual({total:'105.00',principal:'50.00',interest:'30.00',escrow:'25.00',fees:'0.00'})
 expect(old.principal).toBe('51.00');expect(source.principal).toBe('50.00')
})
it('compares monetary values without mistaking formatting for a correction',()=>{
 expect(differsFromStatement(source,{total:'105',principal:'50',interest:'30',escrow:'25'})).toBe(false)
})
it('preserves reversals and rejects invalid precision instead of rounding',()=>{
 expect(statementAllocation({...source,kind:'reversal',total:'0.00',principal:'-50.00',interest:'0.00',escrow:'0.00'}).principal).toBe('-50.00')
 expect(()=>differsFromStatement(source,{...source,principal:'50.001'})).toThrow()
})

import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {ReviewAllocationForm} from './ReviewAllocationForm'
it('renders statement amounts instead of a mistaken saved review and warns before replacement',()=>{
 const html=renderToStaticMarkup(createElement(ReviewAllocationForm,{source,review:{sourceId:'s',original:source,allocation:{...statementAllocation(source),principal:'51.00',interest:'29.00'},reason:'Old note',reversalOf:null,action:'historical_payment',reviewer:'Reviewer',reviewedAt:'2026-10-01'},activity:[source],sourceReady:true,busy:false,reviews:[],onSave:async()=>true,onCancel:()=>{}}))
 expect(html).toContain('$50.00');expect(html).not.toContain('$51.00')
 expect(html).toContain('earlier review stays in history')
 expect(html).not.toContain('id="allocation-principal"')
})
