import { beforeEach, expect, it, vi } from 'vitest'
// Exercise the actual hook with deterministic state and deferred query promises.
// Browser verification additionally checks the mounted form and retained input.
const h = vi.hoisted(() => ({slots:[] as unknown[],cursor:0,get:vi.fn(),save:vi.fn()}))
vi.mock('react', () => ({
 useCallback:(fn:unknown)=>fn, useEffect:()=>{},
 useState:(initial:unknown)=>{const i=h.cursor++;if(!(i in h.slots))h.slots[i]=initial;return[h.slots[i],(next:unknown)=>{h.slots[i]=typeof next==='function'?next(h.slots[i]):next}]},
 useRef:(initial:unknown)=>{const i=h.cursor++;if(!(i in h.slots))h.slots[i]={current:initial};return h.slots[i]},
}))
vi.mock('../../shared/auth/AuthContext',()=>({useAuth:()=>({accountId:'test'})}))
vi.mock('./mortgagePayoffQueries',()=>({getMortgageDetails:h.get,createMortgageDetails:vi.fn(),resetMortgageBalance:vi.fn(),updateMortgageDetails:vi.fn(),voidMortgageDetails:vi.fn()}))
vi.mock('./mortgageDetailsSave',()=>({saveMortgageDetails:h.save}))
import { useMortgageDetails } from './useMortgageDetails'
import type { MortgageDetails } from './mortgagePayoffQueries'
const loan={id:'loan',current_balance:'100',principal_version:1} as MortgageDetails
function render(){h.cursor=0;return useMortgageDetails('property',null)}
beforeEach(()=>{h.slots=[];h.get.mockReset();h.save.mockReset()})
it('late refresh cannot close an edit or silently advance its save version',async()=>{
 h.get.mockResolvedValueOnce({data:loan,error:null});await render().refresh()
 let complete!:(value:unknown)=>void;h.get.mockReturnValueOnce(new Promise(r=>{complete=r}))
 const loading=render().refresh();render().startEditing()
 complete({data:{...loan,current_balance:'90',principal_version:2},error:null});await loading
 expect(render().isEditing).toBe(true)
 h.save.mockResolvedValue({ok:false,error:'refused'});await render().save({...loan,lender_name:'Kept in form'})
 expect(h.save.mock.calls[0][1]).toEqual(loan);expect(render().isEditing).toBe(true)
})
it('explicit Cancel stays closed after a pending refresh',async()=>{
 h.get.mockResolvedValue({data:loan,error:null});await render().refresh();render().startEditing()
 const pending=render().refresh();render().cancelEditing();await pending;expect(render().isEditing).toBe(false)
})
it('a displayed conflict supplies the next deliberate retry baseline; success closes',async()=>{
 h.get.mockResolvedValue({data:loan,error:null});await render().refresh();render().startEditing()
 const latest={...loan,principal_version:2};h.save.mockResolvedValueOnce({ok:false,details:latest,error:'compare figures'}).mockResolvedValueOnce({ok:true,details:latest,error:null})
 await render().save(loan);expect(render().isEditing).toBe(true);await render().save(loan)
 expect(h.save.mock.calls[1][1]).toEqual(latest);expect(render().isEditing).toBe(false)
})
it('no-loan load still allows creation',async()=>{h.get.mockResolvedValue({data:null,error:null});await render().refresh();expect(render().isEditing).toBe(true)})
