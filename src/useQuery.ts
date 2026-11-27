import { useEffect,useState } from 'react'
import {liveQuery} from 'dexie'
export function useQuery<T>(read:()=>Promise<T>,deps:unknown[],onError:(err:unknown)=>void){
  const [result,setResult]=useState<T>()
  useEffect(()=>{const subscription=liveQuery(read).subscribe({next:setResult,error:onError});return ()=>subscription.unsubscribe()},deps)
  return result
}
