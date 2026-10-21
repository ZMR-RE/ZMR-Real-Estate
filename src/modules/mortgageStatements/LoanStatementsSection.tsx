import type { LoanChoice } from './statementTypes'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { PdfCanvasPreview } from '../../shared/pdf/PdfCanvasPreview'
import { MortgageDrawer } from '../mortgageTab/MortgageDrawer'
import { listReviewedStatements } from '../mortgageReconciliation/mortgageReconciliationQueries'
import { LoanReconciliation } from '../mortgageReconciliation/LoanReconciliation'
import { MortgageStatements } from './MortgageStatements'
import { statementOrganizationStore as mortgageStatementStore } from './organizationQueries'

const reviewStatementStore={...mortgageStatementStore,list:listReviewedStatements}

// Candidate integration. Requires the separately reviewed statement schema;
// a missing schema is an error, never an empty statement history.
export function LoanStatementsSection(props: {
 propertyId: string; mortgageId: string; lender: string; loanNumber: string | null
 onDocuments: () => void
}) {
 const { accountId } = useAuth()
 if (!accountId) return <p role="alert">Sign in to view this loan’s statements.</p>
 return <LoanStatementSelector key={`${accountId}/${props.propertyId}`} {...props} accountId={accountId}/>
}
function LoanStatementSelector(props:{propertyId:string;mortgageId:string;lender:string;loanNumber:string|null;onDocuments:()=>void;accountId:string}){
 const [selected,setSelected]=useState(props.mortgageId),[loans,setLoans]=useState<LoanChoice[]>([]),[loadError,setLoadError]=useState<string|null>(null),[loading,setLoading]=useState(true)
 const scope=useMemo(()=>({accountId:props.accountId,propertyId:props.propertyId,mortgageId:props.mortgageId}),[props.accountId,props.propertyId,props.mortgageId])
 useEffect(()=>{let alive=true;mortgageStatementStore.loans(scope).then(v=>{if(alive)setLoans(v)}).catch(()=>{if(alive)setLoadError('Unable to load loans for this property.')}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[scope])
 if(loading)return <p>Loading loan statements…</p>
 if(loadError)return <p role="alert">{loadError}</p>
 const current=selected||loans[0]?.id
 if(!current)return <p className="field-hint">Add a loan before linking statements. Existing files remain in Documents.</p>
 return <ScopedStatements key={current} {...props} mortgageId={current} lender={current===props.mortgageId?props.lender:loans.find(l=>l.id===current)?.label??''} loanNumber={current===props.mortgageId?props.loanNumber:null} loanChoices={loans} onLoanChange={setSelected}/>
}

function ScopedStatements({accountId, propertyId, mortgageId, lender, loanNumber, onDocuments,loanChoices,onLoanChange}: {
 accountId: string; propertyId: string; mortgageId: string; lender: string; loanNumber: string | null
 onDocuments: () => void;loanChoices:LoanChoice[];onLoanChange:(id:string)=>void
}) {
 const scope=useMemo(()=>({accountId,propertyId,mortgageId}),[accountId,propertyId,mortgageId])
 const [reviewing,setReviewing]=useState(false),[reviewEditing,setReviewEditing]=useState(false)
 const [opened,setOpened]=useState<{blob:Blob;url:string}|null>(null)
 const [error,setError]=useState<string|null>(null)
 const [busy,setBusy]=useState(false)
 const active=useRef(true)
 const opening=useRef(false)
 useEffect(()=>{active.current=true;return()=>{active.current=false}},[])
 useEffect(()=>()=>{if(opened)URL.revokeObjectURL(opened.url)},[opened])
 async function open(id:string) {
  if(opening.current)return
  opening.current=true;setBusy(true);setError(null)
  try {
   const blob=await mortgageStatementStore.open(scope,id)
   if(active.current)setOpened({blob,url:URL.createObjectURL(blob)})
  } catch(e) {if(active.current)setError(e instanceof Error?e.message:'Unable to open this statement.')}
  finally {opening.current=false;if(active.current)setBusy(false)}
 }
 return <>
  <div className="statement-actions"><button type="button" disabled={reviewEditing} onClick={()=>setReviewing(!reviewing)}>{reviewing?'Back to statements':'Review statements'}</button></div>
  {reviewing?<LoanReconciliation onEditing={setReviewEditing} propertyId={propertyId} mortgageId={mortgageId}/>:<>
  {error&&<p role="alert">{error}</p>}
  {busy&&<p role="status">Checking and opening the original statement…</p>}
  <MortgageStatements scope={scope} store={reviewStatementStore} lender={lender} loanChoices={loanChoices} onLoanChange={onLoanChange} suffix={loanNumber?.slice(-4)??''} onOpen={id=>{void open(id)}} onDocuments={onDocuments}/>
  {opened&&<MortgageDrawer title="Original statement" busy={false} onCancel={()=>setOpened(null)}>
   <button type="button" onClick={()=>setOpened(null)}>Close statement</button>
   <PdfCanvasPreview pdf={opened.blob} openUrl={opened.url} label="Original mortgage statement" filename="mortgage-statement.pdf"/>
  </MortgageDrawer>}
 </>}
 </>
}
