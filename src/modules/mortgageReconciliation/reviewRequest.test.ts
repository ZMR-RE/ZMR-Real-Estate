import {afterEach,expect,it,vi} from 'vitest'
import {boundedReviewRequest,REVIEW_SAVE_UNCONFIRMED} from './reviewRequest'
afterEach(()=>vi.useRealTimers())
it('a missing response settles with an unknown-outcome message, aborts and never retries',async()=>{
 vi.useFakeTimers();let signal:AbortSignal|undefined
 const run=vi.fn((s:AbortSignal)=>{signal=s;return new Promise(()=>{})})
 const request=boundedReviewRequest(run);const assertion=expect(request).rejects.toThrow(REVIEW_SAVE_UNCONFIRMED)
 await vi.advanceTimersByTimeAsync(15000);await assertion
 expect(signal?.aborted).toBe(true);expect(run).toHaveBeenCalledTimes(1)
})
it('late success cannot replace a timeout with a success state',async()=>{
 vi.useFakeTimers();let resolve!:(v:string)=>void
 const request=boundedReviewRequest(()=>new Promise<string>(r=>resolve=r));const result=expect(request).rejects.toThrow('could not be confirmed')
 await vi.advanceTimersByTimeAsync(15000);await result;resolve('saved')
 await expect(request).rejects.toThrow('could not be confirmed')
})
it('normal and conflict responses return without delay or a second attempt',async()=>{
 const run=vi.fn(async()=>({error:{code:'40001',message:'Review changed in another window.'}}))
 expect(await boundedReviewRequest(run)).toEqual({error:{code:'40001',message:'Review changed in another window.'}})
 expect(run).toHaveBeenCalledTimes(1)
 expect(await boundedReviewRequest(async()=>({revision:4}))).toEqual({revision:4})
})
