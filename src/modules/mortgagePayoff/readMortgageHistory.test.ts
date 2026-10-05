import { expect, it } from 'vitest'
import { readMortgageHistory } from './readMortgageHistory'
it('loads beyond the API cap, even when its cap is lower than requested', async () => {
  const rows = Array.from({length:2501}, (_,i)=>({id:String(i)}))
  const offsets:number[]=[]
  const result = await readMortgageHistory(async (from,to) => {
    offsets.push(from)
    return {data:rows.slice(from,Math.min(from+500,to+1)),error:null,count:rows.length}
  })
  expect(result.error).toBeNull()
  expect(result.data).toEqual(rows)
  expect(offsets).toEqual([0,500,1000,1500,2000,2500])
})
it('returns no partial totals when the count changes between pages', async () => {
  const result=await readMortgageHistory(async from=>({data:[{id:String(from)}],error:null,count:from===0?2:3}))
  expect(result.data).toBeNull()
  expect(result.error?.message).toContain('complete mortgage history')
})
it('refuses overlapping pages rather than double-counting', async () => {
  const result=await readMortgageHistory(async ()=>({data:[{id:'same'}],error:null,count:2}))
  expect(result.data).toBeNull()
  expect(result.error).not.toBeNull()
})
it('propagates a later-page refusal without returning partial data', async () => {
  const result=await readMortgageHistory(async from=>from===0?{data:[{id:'first'}],error:null,count:2}:{data:null,error:{message:'Permission refused'},count:null})
  expect(result).toEqual({data:null,error:{message:'Permission refused'}})
})
it('requires a count and refuses unexpectedly empty pages', async () => {
  expect((await readMortgageHistory(async()=>({data:[],error:null,count:null}))).error).not.toBeNull()
  expect((await readMortgageHistory(async()=>({data:[],error:null,count:1}))).error).not.toBeNull()
  expect(await readMortgageHistory(async()=>({data:[],error:null,count:0}))).toEqual({data:[],error:null})
})
