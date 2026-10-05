import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { MortgagePaymentForm } from './MortgagePaymentForm'
import { EscrowTransactionForm } from './EscrowTransactionForm'
const shared={error:null,statementDate:'2026-09-01',onSave:async()=>true,onConfirmDuplicate:async()=>true,onDismissDuplicate:()=>{}}
it.each([false,true])('payment fields lock during confirmation or saving: saving=%s', saving=>{
  const html=renderToStaticMarkup(<MortgagePaymentForm {...shared} initialValues={{payment_date:'2026-08-01',amount:'100',principal_amount:'80',interest_amount:'20'}} saving={saving} duplicateMessage={saving?null:'An identical entry exists.'}/>)
  expect(html).toContain('aria-label="Payment details" disabled=""')
  expect(html).toContain('value="100"')
  if(!saving) expect(html).toContain('Cancel to edit them.')
})
it('escrow uses the same lock; a fresh form is editable',()=>{
  const initialValues={transaction_date:'2026-08-01',transaction_type:'deposit' as const,amount:'50',description:null}
  const locked=renderToStaticMarkup(<EscrowTransactionForm {...shared} initialValues={initialValues} saving={false} duplicateMessage="Duplicate"/>)
  expect(locked).toContain('aria-label="Escrow details" disabled=""')
  const fresh=renderToStaticMarkup(<EscrowTransactionForm {...shared} initialValues={initialValues} saving={false} duplicateMessage={null}/>)
  expect(fresh).not.toContain('disabled=""')
})
