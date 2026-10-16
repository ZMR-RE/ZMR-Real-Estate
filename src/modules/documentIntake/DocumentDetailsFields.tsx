import { useCallback, useEffect, useRef, useState } from 'react'
import { SearchableSelect } from '../../shared/SearchableSelect'
import { ManageOptionsPanel } from '../../shared/pickLists/ManageOptionsPanel'
import { usePickListOptions } from '../../shared/pickLists/usePickListOptions'
import { useVendors } from '../vendors/useVendors'
import { VendorForm } from '../vendors/VendorForm'
import type { VendorInput } from '../vendors/vendorsQueries'
import { intakeProperties, intakeUnits } from './documentOptionsQueries'
import type { IntakeDetails } from './documentIntake'

export function DocumentDetailsFields({accountId,value,onChange,onNestedFormChange}:{
 accountId:string;value:IntakeDetails;onChange:(details:IntakeDetails)=>void;onNestedFormChange?:(open:boolean)=>void
}){
 const [properties,setProperties]=useState<{id:string;label:string}[]>([]),[unitData,setUnitData]=useState<{scope:string;options:{id:string;label:string}[]}>({scope:'',options:[]})
 const [error,setError]=useState(''),[addingVendor,setAddingVendor]=useState(false),[savingVendor,setSavingVendor]=useState(false)
 const vendorLock=useRef(false),scope=useRef('')
 useEffect(()=>{scope.current=`${accountId}:${value.propertyId}`;return()=>{scope.current=''}},[accountId,value.propertyId])
 const units=unitData.scope===`${accountId}:${value.propertyId}`?unitData.options:[]
 const categories=usePickListOptions('document_type'),vendors=useVendors(accountId)
 function change<K extends keyof IntakeDetails>(key:K,next:IntakeDetails[K]){onChange({...value,[key]:next})}
 const refreshProperties=useCallback(async()=>{const account=accountId;try{const result=await intakeProperties(account);if(scope.current.startsWith(`${account}:`))setProperties(result)}catch(e){setError(String(e))}},[accountId])
 const refreshUnits=useCallback(async()=>{const key=scope.current;if(!value.propertyId)return;try{const result=await intakeUnits(accountId,value.propertyId);if(key===scope.current)setUnitData({scope:key,options:result})}catch(e){setError(String(e))}},[accountId,value.propertyId])
 useEffect(()=>{void Promise.resolve().then(refreshProperties)},[refreshProperties]) // scoped results checked above
 useEffect(()=>{void refreshUnits()},[refreshUnits])
 function toggleVendor(open:boolean){setAddingVendor(open);onNestedFormChange?.(open)}
 async function addVendor(input:VendorInput){
  if(vendorLock.current)return;vendorLock.current=true;setSavingVendor(true);setError('')
  try{const result=await vendors.addVendor(input);if('error' in result)setError(result.error);else{change('vendorId',result.id);toggleVendor(false)}}finally{vendorLock.current=false;setSavingVendor(false)}
 }
 return <div className="document-intake-fields">
  {error&&<p role="alert">{error}</p>}
  <label className="document-intake-wide">Title<input value={value.title} maxLength={255} placeholder="Use filename" onChange={e=>change('title',e.target.value)}/></label>
  <div><label htmlFor="intake-property">Property</label><SearchableSelect inputId="intake-property" options={properties} value={value.propertyId} onOpen={()=>void refreshProperties()} onChange={id=>onChange({...value,propertyId:id,unitId:null})} placeholder="Choose later"/>{value.propertyId&&<button type="button" onClick={()=>onChange({...value,propertyId:null,unitId:null})}>Clear property</button>}</div>
  <label>Applies to<select value={value.unitId??''} disabled={!value.propertyId} onFocus={()=>void refreshUnits()} onChange={e=>change('unitId',e.target.value||null)}><option value="">Whole property</option>{units.map(u=><option key={u.id} value={u.id}>{u.label}</option>)}</select></label>
  <div><label htmlFor="intake-category">Document category</label><select id="intake-category" value={value.category??''} onFocus={()=>void categories.refresh()} onChange={e=>change('category',e.target.value||null)}><option value="">Choose later</option>{categories.activeOptions.map(o=><option key={o.id} value={o.value}>{o.value}</option>)}</select><ManageOptionsPanel title="Document categories" options={categories.options} loading={categories.loading} error={categories.error} saving={categories.saving} onAdd={categories.add} onArchive={categories.archive} onRestore={categories.restore}/></div>
  <details className="document-intake-wide"><summary>More details · optional</summary><div className="document-intake-fields"><label>Document date<input type="date" value={value.documentDate??''} onChange={e=>change('documentDate',e.target.value||null)}/></label>
  <label>Due date<input type="date" value={value.dueDate??''} onChange={e=>change('dueDate',e.target.value||null)}/></label>
  <div className="document-intake-wide"><label htmlFor="intake-vendor">From</label><SearchableSelect inputId="intake-vendor" options={vendors.vendorOptions} value={value.vendorId??null} placeholder="Choose later" onOpen={()=>void vendors.refreshVendorOptions()} onChange={id=>change('vendorId',id)} onAddNew={()=>toggleVendor(true)} addNewLabel="Add vendor"/>{value.vendorId&&<button type="button" onClick={()=>change('vendorId',null)}>Clear vendor</button>}
   {addingVendor&&<VendorForm saving={savingVendor} error={error||null} onSave={input=>void addVendor(input)} onCancel={()=>toggleVendor(false)}/>}</div>
  <label>Responsibility<select value={value.responsibility??''} onChange={e=>change('responsibility',e.target.value as IntakeDetails['responsibility'])}><option value="">Choose later</option><option value="unsure">Unsure</option><option value="tenant">Tenant</option><option value="owner">Owner</option><option value="shared">Shared</option></select></label>
  <label className="document-intake-wide">Notes<textarea value={value.notes} maxLength={10000} rows={3} onChange={e=>change('notes',e.target.value)}/></label>
 </div></details></div>
}
