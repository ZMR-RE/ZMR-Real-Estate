import { jsPDF } from 'jspdf'
import { useMortgageStatements } from '../../modules/mortgageStatements/useMortgageStatements'
import { StatementUploadForm } from '../../modules/mortgageStatements/StatementUploadForm'
import type { StatementScope,StatementStore } from '../../modules/mortgageStatements/statementTypes'
export function UploadInteractionCheck({scope,store}:{scope:StatementScope;store:StatementStore}){
 const state=useMortgageStatements(scope,store)
 return <section><button onClick={async()=>{const pdf=new jsPDF();pdf.text('FICTIONAL NAMING TEST',10,20);await state.addFiles([new File([pdf.output('blob')],'fictional-date-test.pdf',{type:'application/pdf'})])}}>Prepare fictional naming upload</button>
  {state.rows.length>0&&<StatementUploadForm rows={state.rows} busy={state.busy} lender="Fictional Bank" suffix="9876" onFiles={state.addFiles} onChange={state.change} onSave={state.save} onCancel={state.clear}/>}</section>
}
