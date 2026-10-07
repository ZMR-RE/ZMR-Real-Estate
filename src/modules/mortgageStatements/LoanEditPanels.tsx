import { useMemo,useState,type ReactNode } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { StatementPreferenceForm } from './StatementPreferenceForm'
import { statementOrganizationStore } from './organizationQueries'
export function LoanEditPanels({propertyId,mortgageId,children,onCancel,onBusy,busy=false}:{propertyId:string;mortgageId?:string;children:ReactNode;onCancel:()=>void;onBusy?:(busy:boolean)=>void;busy?:boolean}){
 const {accountId}=useAuth();const [panel,setPanel]=useState('details'),[dirty,setDirty]=useState(false)
 const scope=useMemo(()=>({accountId:accountId??'',propertyId,mortgageId:mortgageId??''}),[accountId,propertyId,mortgageId])
 if(!mortgageId||!accountId)return children
 return <><div role="group" aria-label="Loan editing section" className="statement-actions"><button type="button" disabled={dirty||busy} aria-pressed={panel==='details'} onClick={()=>setPanel('details')}>Loan details</button><button type="button" disabled={dirty||busy} aria-pressed={panel==='statements'} onClick={()=>setPanel('statements')}>Statement settings</button></div>{dirty&&<p className="field-hint">Save or cancel your changes before switching sections.</p>}<div onChangeCapture={()=>setDirty(true)}>{panel==='details'?children:<StatementPreferenceForm key={`${accountId}/${propertyId}/${mortgageId}`} scope={scope} store={statementOrganizationStore} onCancel={onCancel} onSaved={onCancel} onBusy={onBusy}/>}</div></>
}
