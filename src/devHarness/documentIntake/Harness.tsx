import {useState} from 'react'
import {DocumentIntakePanel} from '../../modules/documentIntake/DocumentIntakePanel'
import {scenario} from './mockClient'
export function Harness(){
 const [adding,setAdding]=useState(false)
 return <div><p role="note">LOCAL TEST · Simulated service · Refresh clears test files</p>
  <div className="page-header-row"><h1>Quick capture</h1><button onClick={()=>setAdding(true)}>+ Add document</button></div>
  <details><summary>Test controls</summary><button onClick={()=>{scenario.failFinish=true}}>Interrupt next save after upload</button></details>
  <DocumentIntakePanel key={adding?'capture':'history'} capture={adding} onCancel={()=>setAdding(false)} onCaptured={()=>setAdding(false)}/>
 </div>
}
