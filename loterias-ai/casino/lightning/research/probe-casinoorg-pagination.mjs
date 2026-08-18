#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const base='https://api-cs.casino.org/svc-evolution-game-events/api/lightningroulette';
const out='loterias-ai/casino/lightning/evidence/casinoorg-pagination-probe.json';
const variants=[
  {id:'base',query:''},
  {id:'limit100',query:'?limit=100'},
  {id:'offset30',query:'?offset=30'},
  {id:'page2',query:'?page=2'},
  {id:'skip30',query:'?skip=30'},
  {id:'page1limit100',query:'?page=1&limit=100'},
  {id:'page2limit30',query:'?page=2&limit=30'}
];
function parseItem(item){const d=item?.data||item;const roundId=String(item?.id||d?.id||'');const rawTs=d?.settledAt||d?.startedAt||null;const t=Date.parse(rawTs);return roundId&&Number.isFinite(t)?{roundId,timestamp:new Date(t).toISOString()}:null;}
const results=[];
for(const v of variants){
  const url=base+v.query;
  try{
    const r=await fetch(url,{headers:{accept:'application/json','user-agent':'LoteriasAI-pagination-probe/1.0','cache-control':'no-cache, no-store, max-age=0',pragma:'no-cache'}});
    const text=await r.text();let payload=null,parseError=null;try{payload=JSON.parse(text)}catch(e){parseError=String(e?.message||e)}
    const items=Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:[];
    const parsed=items.map(parseItem).filter(Boolean).sort((a,b)=>a.timestamp.localeCompare(b.timestamp)||a.roundId.localeCompare(b.roundId));
    results.push({id:v.id,query:v.query,httpStatus:r.status,httpOk:r.ok,contentType:r.headers.get('content-type'),bytes:text.length,responseSha256:crypto.createHash('sha256').update(text).digest('hex'),parseError,itemCount:items.length,parsedCount:parsed.length,earliest:parsed[0]||null,latest:parsed.at(-1)||null,firstFiveRoundIds:parsed.slice(0,5).map(x=>x.roundId),lastFiveRoundIds:parsed.slice(-5).map(x=>x.roundId)});
  }catch(e){results.push({id:v.id,query:v.query,httpStatus:0,httpOk:false,error:String(e?.message||e)});}
}
const baseResult=results.find(x=>x.id==='base');
for(const r of results){r.differsFromBase=Boolean(baseResult&&r.responseSha256&&r.responseSha256!==baseResult.responseSha256);r.earlierThanBase=Boolean(baseResult?.earliest?.timestamp&&r.earliest?.timestamp&&r.earliest.timestamp<baseResult.earliest.timestamp);}
const candidates=results.filter(r=>r.httpOk&&r.parsedCount>0&&(r.earlierThanBase||r.itemCount>(baseResult?.itemCount||0)||r.differsFromBase)).map(r=>r.id);
const report={version:'casinoorg-pagination-probe-v1',generatedAt:new Date().toISOString(),endpoint:base,purpose:'Find documented-by-behavior pagination/query semantics capable of recovering a missing authoritative interval. Diagnostic only.',results,paginationCandidates:candidates,policy:{mayMutateCorpus:false,mayAdvanceProspectives:false,maximumVariantsTested:variants.length,noWinnerOrMultiplierValuesPersisted:true},guards:{trainingDataMutation:false,prospectiveOutcomeMutation:false,realMoneyAllowed:false}};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({paginationCandidates:candidates,results:results.map(r=>({id:r.id,status:r.httpStatus,count:r.itemCount,earliest:r.earliest?.timestamp,latest:r.latest?.timestamp,differs:r.differsFromBase,earlier:r.earlierThanBase}))},null,2));
