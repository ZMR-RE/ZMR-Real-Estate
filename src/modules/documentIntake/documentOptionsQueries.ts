import { supabase } from '../../shared/supabaseClient'
import { propertyLabel } from '../../shared/propertyLabel'
export async function intakeProperties(accountId: string) {
 const options: { id: string; label: string }[] = []
 for (let offset=0; ; offset+=100) {
  const { data, error } = await supabase.from('properties').select('id,address,name')
   .eq('account_id',accountId).order('id').range(offset,offset+99)
  if(error) throw Error(error.message)
  options.push(...data.map(p=>({id:p.id,label:propertyLabel(p)})))
  if(data.length<100)return options.sort((a,b)=>a.label.localeCompare(b.label))
 }
}
export async function intakeUnits(accountId: string, propertyId: string) {
 const {data,error}=await supabase.from('units').select('id,unit_label').eq('account_id',accountId)
  .eq('property_id',propertyId).eq('archived',false).order('unit_label')
 if(error)throw Error(error.message)
 return data.map(u=>({id:u.id,label:u.unit_label}))
}
