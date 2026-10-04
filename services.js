export function config(env=process.env){
 const keys=['GEMINI_API_KEY','SUPABASE_URL','SUPABASE_SERVICE_KEY','VISITOR_SECRET'];
 if(keys.some(k=>!env[k]))throw new Error('The demo service is unavailable.');
 return {...Object.fromEntries(keys.map(k=>[k,env[k]])),model:env.GEMINI_MODEL||'gemini-3.5-flash-lite'};
}
export async function database(c,path,{method='GET',body,headers={}}={}) {
 const res=await fetch(`${c.SUPABASE_URL}/rest/v1/${path}`,{method,headers:{apikey:c.SUPABASE_SERVICE_KEY,Authorization:`Bearer ${c.SUPABASE_SERVICE_KEY}`,'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(6000)});
 if(!res.ok)throw new Error('Database request failed.');
 const raw=await res.text();return {data:raw?JSON.parse(raw):null,headers:res.headers};
}
export async function usage(c){const result=await database(c,'rpc/baari_usage',{method:'POST',body:{}});return result.data;}
