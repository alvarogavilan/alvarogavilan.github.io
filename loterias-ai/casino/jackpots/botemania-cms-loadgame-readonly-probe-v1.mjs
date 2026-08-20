#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const SRC='loterias-ai/casino/jackpots/evidence/botemania-cms-component-query-extractor-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-cms-loadgame-readonly-probe-v1.json';
const ENDPOINT='https://www.botemania.es/es/graphql';
const VENTURE='botemania_es';
const GAME='irish-riches-megaways-jackpot-king';
const src=JSON.parse(fs.readFileSync(SRC,'utf8'));
const normalize=s=>String(s||'')
  .replace(/\\n/g,'\n')
  .replace(/\\r/g,'\r')
  .replace(/\\t/g,'\t')
  .replace(/\\"/g,'"')
  .replace(/\\\r?\n/g,'\n')
  .trim();
const queries=[...new Set((src.candidateSourceBodies||[]).map(normalize).filter(q=>/^query\s+loadGame\b/i.test(q)&&/\bgames\s*\(/i.test(q)&&!/\bmutation\b/i.test(q)))].slice(0,4);
if(!queries.length) throw new Error('No exact read-only loadGame query recovered in CMS artifact');
const headers={accept:'application/json','content-type':'application/json',venture:VENTURE,origin:'https://www.botemania.es',referer:'https://www.botemania.es/juegos/slots-online/irish-riches-megaways-jackpot-king','user-agent':'loterias-ai-cms-loadgame-readonly-probe/1.1','cache-control':'no-cache'};
const attempts=[];
for(const query of queries){
  try{
    const variables={gameIds:[GAME]};
    const r=await fetch(ENDPOINT,{method:'POST',headers,body:JSON.stringify({operationName:'loadGame',variables,query})});
    const text=await r.text();let body=null;try{body=JSON.parse(text)}catch{}
    attempts.push({querySha256:crypto.createHash('sha256').update(query).digest('hex'),queryPreview:query.slice(0,7000),variables,httpStatus:r.status,ok:r.ok,bytes:text.length,responseSha256:crypto.createHash('sha256').update(text).digest('hex'),errors:(body?.errors||[]).map(e=>String(e?.message||e)).slice(0,20),data:body?.data||null,rawPreview:body?null:text.slice(0,1200)});
  }catch(e){attempts.push({error:String(e?.stack||e?.message||e)});}
}
const successful=attempts.filter(a=>a.ok&&a.data&&!(a.errors||[]).length);
const serialized=JSON.stringify(successful.map(x=>x.data));
const out={version:'botemania-cms-loadgame-readonly-probe-v1.1-exact-unescape',generatedAt:new Date().toISOString(),operator:'botemania-es',targetGame:GAME,sourceArtifact:SRC,endpoint:ENDPOINT,attempts,decision:{exactRecoveredQueryExecuted:true,successfulReadOnlyResponses:successful.length,gameDataRecovered:successful.some(a=>Array.isArray(a.data?.games)&&a.data.games.length>0),jackpotTermPresentInReturnedData:/jackpot/i.test(serialized),headlessTermPresentInReturnedData:/headless|jackpotsParams/i.test(serialized),realMoneyAllowed:false},guards:{exactBundleRecoveredQueriesOnly:true,onlyEscapeNormalizationChanged:true,noGraphqlIntrospection:true,noMutation:true,noAuthentication:true,noCookies:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({attempts:attempts.map(a=>({querySha256:a.querySha256,httpStatus:a.httpStatus,ok:a.ok,errors:a.errors,dataKeys:a.data&&Object.keys(a.data)})),decision:out.decision},null,2));
