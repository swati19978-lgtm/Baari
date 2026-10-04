import {SYSTEM_PROMPT,validateInput,estimate,visitorFromCookie,anonymousVisitor,makePrompt} from './core.js';
import {config,database,usage} from './services.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Use the demo form.'});}
 const origin=req.headers.origin;
 if(origin&&origin!==`https://${req.headers.host}`&&origin!==`http://${req.headers.host}`)return res.status(403).json({error:'Open the demo on this website.'});
 let input,c,id;
 try{input=validateInput(typeof req.body==='string'?JSON.parse(req.body):req.body);}catch{return res.status(400).json({error:'Choose valid demo fields. No personal details are needed.'});}
 try{
  c=config();const visitor=visitorFromCookie(req.headers.cookie,c.VISITOR_SECRET);if(visitor.cookie)res.setHeader('Set-Cookie',visitor.cookie);
  const claimed=await database(c,'rpc/baari_claim',{method:'POST',body:{p_visitor:anonymousVisitor(visitor.id,c.VISITOR_SECRET),p_input:input}});
  id=claimed.data;
  if(!id)return res.status(429).json({error:'You have used your 5 demo requests for today. Please try again tomorrow.'});
 }catch{return res.status(503).json({error:'The demo service is unavailable. Please try again shortly.'});}
 let inputTokens=0,outputTokens=0;
 try{
  const modelResult=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${c.model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':c.GEMINI_API_KEY},body:JSON.stringify({systemInstruction:{parts:[{text:SYSTEM_PROMPT}]},contents:[{role:'user',parts:[{text:makePrompt(input)}]}],generationConfig:{maxOutputTokens:200,temperature:0.2,thinkingConfig:{thinkingBudget:0}}}),signal:AbortSignal.timeout(12000)});
  if(!modelResult.ok)throw new Error('Generation failed');
  const result=await modelResult.json();inputTokens=result.usageMetadata?.promptTokenCount||0;outputTokens=result.usageMetadata?.candidatesTokenCount||0;
  const answer=(result.candidates?.[0]?.content?.parts||[]).filter(p=>!p.thought).map(p=>p.text||'').join('').trim();
  if(!answer||result.candidates?.[0]?.finishReason!=='STOP')throw new Error('Incomplete generation');
  await database(c,`baari_requests?id=eq.${id}`,{method:'PATCH',body:{output:answer,input_tokens:inputTokens,output_tokens:outputTokens,status:'complete'}});
  const stats=await usage(c);
  return res.status(200).json({answer,range:input.scenario==='queue'?estimate(input):null,stats});
 }catch{
  try{await database(c,`baari_requests?id=eq.${id}`,{method:'PATCH',body:{output:'Generation could not be completed.',input_tokens:inputTokens,output_tokens:outputTokens,status:'error'}});}catch{}
  return res.status(503).json({error:'We could not generate this message. Please try again shortly.'});
 }
}
