/** A missing response is an unknown outcome, not proof that the write failed. */
export const REVIEW_SAVE_UNCONFIRMED = 'The save could not be confirmed. Your entries are still here. Try Save again to check the same request safely.'
export async function boundedReviewRequest<T>(run:(signal:AbortSignal)=>PromiseLike<T>,milliseconds=15000):Promise<T>{
 const controller=new AbortController()
 let timer:ReturnType<typeof setTimeout>|undefined
 try{
  return await Promise.race([
   new Promise<T>((_,reject)=>{timer=setTimeout(()=>{reject(new Error(REVIEW_SAVE_UNCONFIRMED));controller.abort()},milliseconds)}),
   Promise.resolve().then(()=>run(controller.signal)),
  ])
 }finally{clearTimeout(timer)}
}
