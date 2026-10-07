export function PickListSelect({id,value,onChange,required}:{id:string;value:string;onChange:(value:string)=>void;required?:boolean}) {
 return <select id={id} value={value} required={required} onChange={e=>onChange(e.target.value)}><option value="">Select a category</option><option>Mortgage</option><option>Insurance</option><option>Other</option></select>
}
