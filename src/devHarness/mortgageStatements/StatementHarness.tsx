import { StatementPreferenceForm } from '../../modules/mortgageStatements/StatementPreferenceForm'
import { CollapsibleSection } from '../../shared/CollapsibleSection'
import { MortgageDrawer } from '../../modules/mortgageTab/MortgageDrawer'
import { UploadInteractionCheck } from './UploadInteractionCheck'
import '../../modules/mortgageTab/mortgageTab.css'
import { useEffect, useState } from 'react'
import { MortgageStatements } from '../../modules/mortgageStatements/MortgageStatements'
import { StatementList } from '../../modules/mortgageStatements/StatementList'
import type { StatementDocument } from '../../modules/mortgageStatements/statementTypes'
import { PdfCanvasPreview } from '../../shared/pdf/PdfCanvasPreview'
import { localStatementStore } from './localStore'
import '../../index.css'
const scope={accountId:'fictional-account',propertyId:'fictional-property',mortgageId:'fictional-loan'}
const local=localStatementStore()
export function App(){
  const [settings,setSettings]=useState(false)
  const [ready,setReady]=useState(false)
  const [view,setView]=useState<'mortgage'|'documents'>('mortgage')
  const [revision,setRevision]=useState(0)
  useEffect(()=>{void local.seed(scope).then(()=>{setReady(true);setRevision(v=>v+1)})},[])
  const [docs,setDocs]=useState<StatementDocument[]>([])
  const [opened,setOpened]=useState<{blob:Blob;url:string;name:string}|null>(null)
  const [error,setError]=useState<string|null>(null)
  useEffect(()=>{void local.store.list(scope).then(setDocs)},[view,revision])
  useEffect(()=>()=>{if(opened)URL.revokeObjectURL(opened.url)},[opened])
  async function open(id:string){try{const blob=await local.store.open(scope,id);setOpened({blob,url:URL.createObjectURL(blob),name:(await local.store.list(scope)).find(d=>d.id===id)!.displayName})}catch(e){setError(String(e))}}
  return <section className="property-profile">
    <p className="field-hint">Local engineering preview · fictional data · no service connection</p>
    <h1>100 Example Street</h1>
    <CollapsibleSection title="Loan summary" defaultOpen><div className="statement-actions"><strong>Example Bank · •1234</strong><button onClick={()=>setSettings(true)}>Edit loan</button></div><div className="mortgage-summary-strip"><div><span>Recorded principal balance</span><strong>$142,850.00</strong></div><div><span>Recorded escrow balance</span><strong>$1,240.00</strong></div><div><span>Interest rate</span><strong>4.25%</strong></div></div></CollapsibleSection>
    {settings&&<MortgageDrawer title="Edit loan · Statement settings" busy={false} onCancel={()=>setSettings(false)}><StatementPreferenceForm scope={scope} store={local.store} onCancel={()=>setSettings(false)} onSaved={()=>setSettings(false)}/></MortgageDrawer>}
    <div className="statement-actions"><button onClick={()=>{setView('mortgage');setOpened(null)}}>Mortgage</button><button onClick={()=>{setView('documents');setOpened(null)}}>Documents</button></div>
    <p className="field-hint">Uploads remain in this browser’s memory and disappear on reload. Nothing goes to ZMR or another provider.</p>
    {error&&<p role="alert">{error}</p>}
    {opened?<section><h2>{opened.name}</h2><button onClick={()=>setOpened(null)}>Close statement</button><PdfCanvasPreview pdf={opened.blob} label={opened.name} openUrl={opened.url} filename={opened.name}/></section>:
      view==='mortgage'?(ready?<MortgageStatements key={revision} scope={scope} store={local.store} lender="Example Bank" suffix="1234" onOpen={id=>{void open(id)}} onDocuments={()=>setView('documents')}/>:<p>Loading sample statements…</p>):
      <section><h2>Property Documents · Mortgage statements</h2><StatementList documents={docs} onOpen={id=>{void open(id)}}/></section>}
    <details><summary>Engineering fixtures</summary><UploadInteractionCheck scope={scope} store={local.store}/><button onClick={async()=>{await local.seed(scope);setRevision(v=>v+1)}}>Load eight fictional statements</button>
      <button onClick={()=>local.failNext()}>Simulate next upload response lost</button></details>
  </section>
}
