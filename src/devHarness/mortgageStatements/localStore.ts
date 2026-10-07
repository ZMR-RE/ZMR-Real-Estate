import { jsPDF } from 'jspdf'
import type { StatementDocument, StatementScope, StatementOrganizationStore } from '../../modules/mortgageStatements/statementTypes'
import { assertScope, sameScope } from '../../modules/mortgageStatements/statementLogic'
// Local browser-only adapter. No Supabase, fetch, persistence or credentials.
// It models canonical document identity; server guarantees are still unbuilt.
export function localStatementStore() {
  const docs = new Map<string, StatementDocument>()
  const blobs = new Map<string, Blob>()
  const requests = new Map<string, string>()
  let loseResponse = false
  let preferences:import('../../modules/mortgageStatements/statementTypes').StatementPreference|null=null
  const store: StatementOrganizationStore = {
    loans: async scope=>[{id:scope.mortgageId,label:'Example Bank •1234'},{id:'earlier-loan',label:'Earlier Bank •9999 · Closed'}],
    existing:async()=>[{id:'unlinked',label:'Earlier saved PDF',storagePath:'memory',mortgageId:null}],
    link:async(scope)=>{const d={...scope,id:'unlinked',originalFilename:'earlier.pdf',displayName:'Earlier saved PDF',digest:'existing',statementDate:null,uploadedAt:'2026-10-07',loanStatus:'needs_review' as const,booksStatus:'not_reconciled' as const,revision:1};docs.set(d.id,d);const pdf=new jsPDF();pdf.text('FICTIONAL EXISTING STATEMENT',15,30);blobs.set(d.id,pdf.output('blob'));return d},
    update:async(scope,original,input)=>{const d=docs.get(original.id);if(!d)throw Error('Unavailable');assertScope(d,scope);if(d.revision!==original.revision||d.displayName!==original.displayName)throw Error('Statement changed; cancel and reopen Edit.');const next={...d,...input,revision:(d.revision??1)+1};docs.set(next.id,next);return next},
    preference:async()=>preferences,
    savePreference:async(_scope,input)=>{if(input.revision!==(preferences?.revision??0))throw Error('Settings changed');preferences={...input,revision:input.revision+1};return preferences},
    list: async scope => [...docs.values()].filter(doc=>sameScope(scope,doc)),
    upload: async (scope, input) => {
      const key = `${scope.accountId}/${scope.propertyId}/${scope.mortgageId}/${input.requestId}`
      const existing = requests.get(key) ?? [...docs.values()].find(doc=>sameScope(doc,scope)&&doc.digest===input.digest)?.id
      if(existing) return docs.get(existing)!
      const document: StatementDocument = {...scope,id:crypto.randomUUID(),originalFilename:input.originalFilename,
        displayName:input.displayName,statementDate:input.statementDate,revision:1,digest:input.digest,uploadedAt:new Date().toISOString(),loanStatus:'needs_review',booksStatus:'not_reconciled'}
      docs.set(document.id,document);blobs.set(document.id,input.file);requests.set(key,document.id)
      if(loseResponse){loseResponse=false;throw Error('Simulated lost response after storage. Retry returns the same document.')}
      return document
    },
    open: async (scope,id) => {const doc=docs.get(id);if(!doc)throw Error('Document not found.');assertScope(doc,scope);return blobs.get(id)!},
  }
  async function seed(scope: StatementScope) {
    for(const month of [1,2,3,4,6,7,8,9]) {
      const date=`2026-${String(month).padStart(2,'0')}-${new Date(2026,month,0).getDate()}`
      const pdf=new jsPDF();pdf.text('FICTIONAL MORTGAGE STATEMENT — LOCAL TEST ONLY',15,30);pdf.text(`Statement date: ${date}`,15,50)
      const file=new File([pdf.output('blob')],`fictional-${date}.pdf`,{type:'application/pdf'})
      const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('');const saved=await store.upload(scope,{requestId:date,digest,file,originalFilename:file.name,displayName:`Example Bank •1234 — Statement — ${date}.pdf`,statementDate:date});docs.set(saved.id,{...saved,periodStart:`2026-${String(month).padStart(2,'0')}-01`,periodEnd:date,documentKind:'statement'})
    }
  }
  return {store,seed,failNext:()=>{loseResponse=true}}
}
