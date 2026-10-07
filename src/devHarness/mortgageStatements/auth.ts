// Local harness only. No real session or service credentials.
export function useAuth(){return {accountId:'fictional-account',session:{user:{id:'fictional-user',email:'fictional@example.test'}},loading:false,signOut:async()=>{}}}
