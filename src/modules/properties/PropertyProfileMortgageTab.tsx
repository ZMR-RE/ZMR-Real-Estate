import { useRef, useState } from 'react'
import { useMortgageForProperty } from '../mortgagePayoff/useMortgageForProperty'
import { MortgageDetailsForm } from '../mortgagePayoff/MortgageDetailsForm'
import { MortgagePropertySummary } from '../mortgagePayoff/MortgagePropertySummary'
import { MortgagePaymentForm } from '../mortgagePayoff/MortgagePaymentForm'
import { MortgagePaymentList } from '../mortgagePayoff/MortgagePaymentList'
import { EscrowTransactionForm } from '../mortgagePayoff/EscrowTransactionForm'
import { EscrowTransactionList } from '../mortgagePayoff/EscrowTransactionList'
import { CollapsibleSection } from '../../shared/CollapsibleSection'
import { MortgageDrawer } from '../mortgageTab/MortgageDrawer'
import { MortgageBalancePanel } from '../mortgageTab/MortgageBalancePanel'
import { MortgagePlanner } from '../mortgageTab/MortgagePlanner'
import { money, readableDate } from '../mortgageTab/presentationLogic'
import '../mortgageTab/mortgageTab.css'
import type { Property } from './propertiesQueries'

interface PropertyProfileMortgageTabProps {
  property: Property
  marketValue: string | null
  onOpenDocuments?: () => void
}

export function PropertyProfileMortgageTab({ property, marketValue, onOpenDocuments }: PropertyProfileMortgageTabProps) {
  const m = useMortgageForProperty(property.id, marketValue)
  const loan = m.mortgageDetails
  const [entry, setEntry] = useState<'payment' | 'escrow' | null>(null)
  const [newLoan, setNewLoan] = useState(false)
  const [entrySaving, setEntrySaving] = useState(false)
  const entryInFlight = useRef(false)
  // Keep the drawer locked through the post-save refresh, not just the write.
  async function runEntrySave(action: () => Promise<boolean>): Promise<boolean> {
    if (entryInFlight.current) return false
    entryInFlight.current = true
    setEntrySaving(true)
    try { return await action() }
    finally { entryInFlight.current = false; setEntrySaving(false) }
  }
  const [showVoidedPayments, setShowVoidedPayments] = useState(false)
  const [showVoidedEscrow, setShowVoidedEscrow] = useState(false)
  // A refresh after a save must not unmount a form and discard its values.
  if (m.loading && !loan && !m.isEditing) return <p>Loading mortgage details…</p>
  if (m.error && !loan && !m.isEditing) return <p role="alert">{m.error}</p>
  const closeDetails = () => { m.cancelEditing(); setNewLoan(false) }
  const closePayment = () => { m.dismissPaymentDuplicate(); setEntry(null) }
  const closeEscrow = () => { m.dismissEscrowDuplicate(); setEntry(null) }
  return <div className="mortgage-workspace">
    {m.error && <p role="alert">{m.error}</p>}
    {loan ? <>
      <header className="mortgage-heading"><div><h2>Loan summary</h2><p>{loan.lender_name || 'Lender not recorded'}</p></div><button type="button" onClick={m.startEditing}>Edit loan</button></header>
      <div className="mortgage-summary-strip">
        <div><span>Recorded principal balance</span><strong>{money.format(Number(loan.current_balance))}</strong><small>{loan.principal_as_of ? `Last statement: ${readableDate(loan.principal_as_of)}` : 'Statement date not recorded'}</small></div>
        <div><span>Monthly principal &amp; interest</span><strong>{money.format(Number(loan.monthly_payment))}</strong><small>Excludes escrow</small></div>
        <div><span>Interest rate</span><strong>{Number(loan.interest_rate)}%</strong><small>Recorded loan rate</small></div>
        <div><span>Recorded escrow balance</span><strong>{loan.escrow_balance === null ? 'Not recorded' : money.format(Number(loan.escrow_balance))}</strong><small>{loan.escrow_as_of ? `Last statement: ${readableDate(loan.escrow_as_of)}` : 'Statement date not recorded'}</small></div>
      </div>
      <p className="field-hint">Recorded balances include changes entered since the statement dates; they may differ from your lender’s current figures.</p>
      <div className="mortgage-overview-grid"><MortgageBalancePanel loan={loan} payments={m.payments}/><section className="mortgage-panel"><h2>Payment schedule</h2><strong className="mortgage-scheduled-amount">{money.format(Number(loan.monthly_payment))}<small> monthly principal &amp; interest</small></strong><p className="field-hint">Due date and automatic-payment status are not recorded here. Recording a payment does not send money to your lender.</p><button type="button" onClick={()=>{m.beginPaymentEntry();setEntry('payment')}}>Add payment</button></section></div>
    </> : <section className="mortgage-panel"><h2>No active loan</h2><p>Existing payment and escrow records remain available below.</p><button type="button" onClick={()=>{setNewLoan(true);m.startEditing()}}>Add loan</button></section>}
    <CollapsibleSection title="Payment history">
      <div className="mortgage-section-actions"><p className="field-hint">Recorded payments for this property, including earlier loans.</p>{loan && <button type="button" onClick={()=>{m.beginPaymentEntry();setEntry('payment')}}>Add payment</button>}</div>
      <label><input type="checkbox" checked={showVoidedPayments} onChange={e=>setShowVoidedPayments(e.target.checked)}/> Show voided payments</label>
      {m.paymentError && entry!=='payment' && <p role="alert">{m.paymentError}</p>}
      <MortgagePaymentList payments={m.payments.filter(p=>showVoidedPayments || !p.voided)} onVoid={m.voidPayment} voiding={m.loggingPayment}/>
    </CollapsibleSection>
    <CollapsibleSection title="Escrow activity">
      <div className="mortgage-section-actions"><p className="field-hint">Deposits and disbursements recorded for this property.</p>{loan && <button type="button" onClick={()=>{m.beginEscrowEntry();setEntry('escrow')}}>Add escrow entry</button>}</div>
      <label><input type="checkbox" checked={showVoidedEscrow} onChange={e=>setShowVoidedEscrow(e.target.checked)}/> Show voided entries</label>
      {m.escrowTransactionError && entry!=='escrow' && <p role="alert">{m.escrowTransactionError}</p>}
      <EscrowTransactionList transactions={m.escrowTransactions.filter(p=>showVoidedEscrow || !p.voided)} onVoid={m.voidEscrowTransaction} voiding={m.loggingEscrowTransaction}/>
    </CollapsibleSection>
    {loan && <MortgagePlanner loan={loan}/>}
    <CollapsibleSection title="Statements & documents"><p>Mortgage documents are kept in this property’s Documents tab. They may relate to any loan on the property.</p>{onOpenDocuments ? <button type="button" onClick={onOpenDocuments}>Open property documents</button> : <p className="field-hint">Open Documents from the property tabs.</p>}</CollapsibleSection>
    {loan && <CollapsibleSection title="Loan details"><MortgagePropertySummary mortgageDetails={loan} marketValue={marketValue} equity={m.equity} onEdit={m.startEditing} onVoid={() => { setNewLoan(false); return m.voidMortgage() }} voiding={m.saving} error={m.detailsError}/></CollapsibleSection>}
    {m.isEditing && (loan || newLoan) && <MortgageDrawer title={loan?'Edit loan':'Add loan'} busy={m.saving} onCancel={closeDetails}><MortgageDetailsForm key={loan?.id ?? 'new'} initialValues={m.formInitialValues} saving={m.saving} error={m.detailsError} canCancel onSave={m.save} onCancel={closeDetails}/></MortgageDrawer>}
    {loan && entry==='payment' && <MortgageDrawer title="Add payment" busy={entrySaving || m.loggingPayment} onCancel={closePayment}><MortgagePaymentForm initialValues={m.paymentFormInitialValues} saving={entrySaving || m.loggingPayment} error={m.paymentError} onSave={(input, history) => runEntrySave(() => m.logPayment(input, history))} statementDate={loan.principal_as_of} duplicateMessage={m.paymentDuplicate?.message ?? null} onConfirmDuplicate={() => runEntrySave(m.confirmPaymentDuplicate)} onDismissDuplicate={m.dismissPaymentDuplicate} onCancel={closePayment} onSaved={()=>setEntry(null)}/></MortgageDrawer>}
    {loan && entry==='escrow' && <MortgageDrawer title="Add escrow entry" busy={entrySaving || m.loggingEscrowTransaction} onCancel={closeEscrow}><EscrowTransactionForm initialValues={m.escrowTransactionFormInitialValues} saving={entrySaving || m.loggingEscrowTransaction} error={m.escrowTransactionError} onSave={(input, history) => runEntrySave(() => m.logEscrowTransaction(input, history))} statementDate={loan.escrow_as_of} duplicateMessage={m.escrowDuplicate?.message ?? null} onConfirmDuplicate={() => runEntrySave(m.confirmEscrowDuplicate)} onDismissDuplicate={m.dismissEscrowDuplicate} onCancel={closeEscrow} onSaved={()=>setEntry(null)}/></MortgageDrawer>}
  </div>
}
