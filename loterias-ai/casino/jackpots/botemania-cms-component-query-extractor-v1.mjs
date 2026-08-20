#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const OUT='loterias-ai/casino/jackpots/evidence/botemania-cms-component-query-extractor-v1.json';
const ORIGIN='https://www.botemania.es';
const UA='loterias-ai-cms-component-query-extractor/1.1';
const headers={accept:'application/javascript,text/html,*/*','user-agent':UA,'cache-control':'no-cache'};
const resultBase={version:'botemania-cms-component-query-extractor-v1.1-bounded',generatedAt:new Date().toISOString(),operator:'botemania-es'};

const persist=obj=>{fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(obj,null,2)+'\n');};

try{
  const home=await fetch(`${ORIGIN}/`,{headers,redirect:'follow'}); const html=await home.text();
  const rm=html.match(/(?:src=["'])([^"']*\/runtime\.[a-f0-9]+\.js)/i);
  const runtimeUrl=rm?new URL(rm[1],ORIGIN).href:`${ORIGIN}/es/runtime.88e5d9042d77e378fcb1.js`;
  const rr=await fetch(runtimeUrl,{headers,redirect:'follow'}),runtime=await rr.text();
  const pairs=[];for(const m of runtime.matchAll(/(\d+):["']([^"']+)["']/g))pairs.push({id:m[1],value:m[2]});
  const names=new Map(),hashes=new Map();
  for(const p of pairs){if(/^[a-f0-9]{16,40}$/i.test(p.value))hashes.set(p.id,p.value);else if(/[A-Za-z]/.test(p.value))names.set(p.id,p.value);}
  const chunks=[];
  for(const [id,name] of names){const hash=hashes.get(id);if(!hash)continue;if(!/content|page|layout|lobby|home|component|container|cms|generic|dynamic/i.test(name))continue;chunks.push({id,name,url:`${ORIGIN}/es/${name}.${hash}.js`});}
  const uniq=[...new Map(chunks.map(x=>[x.url,x])).values()].slice(0,220);
  const terms=['contentful','jackpotsParams','HeadlessJackpots','gameTag','loadGames','contentApi','content-api','contentUrl','layout','page'];
  const rows=[];let cursor=0;
  async function worker(){while(true){const i=cursor++;if(i>=uniq.length)return;const c=uniq[i];try{const r=await fetch(c.url,{headers,redirect:'follow'}),text=await r.text();const low=text.toLowerCase();const hits=terms.filter(t=>low.includes(t.toLowerCase()));if(!hits.length)continue;
      const operationNames=[];for(const m of text.matchAll(/(?:query|mutation)\\?\s+([A-Za-z0-9_]+)/g))operationNames.push(m[1]);for(const m of text.matchAll(/operationName\s*[:=]\s*["']([A-Za-z0-9_]+)["']/g))operationNames.push(m[1]);
      const snippets=[];for(const term of hits){let p=0,n=0;while(n<3){const at=low.indexOf(term.toLowerCase(),p);if(at<0)break;snippets.push({term,context:text.slice(Math.max(0,at-450),Math.min(text.length,at+950))});p=at+term.length;n++;}}
      const gqlBodies=[];for(const m of text.matchAll(/body:\\?"((?:[^"\\]|\\.){1,5000})"/g)){const raw=m[1];if(/query|mutation/i.test(raw)&&/content|page|layout|component|jackpot|game/i.test(raw))gqlBodies.push(raw.slice(0,5000));if(gqlBodies.length>=10)break;}
      rows.push({name:c.name,url:c.url,httpStatus:r.status,bytes:text.length,sha256:crypto.createHash('sha256').update(text).digest('hex'),hits,operationNames:[...new Set(operationNames)].slice(0,40),gqlBodies:[...new Set(gqlBodies)].slice(0,10),snippets});
    }catch(e){rows.push({name:c.name,url:c.url,error:String(e?.message||e),hits:[]});}}}
  await Promise.all(Array.from({length:10},()=>worker()));
  const ops=[...new Set(rows.flatMap(x=>x.operationNames||[]))].filter(x=>/content|page|layout|component|game|lobby|home/i.test(x));
  const bodies=[...new Set(rows.flatMap(x=>x.gqlBodies||[]))].slice(0,60);
  const highValue=rows.filter(x=>(x.hits||[]).some(h=>/contentful|jackpotsParams|HeadlessJackpots|contentApi|content-api/i.test(h)));
  const out={...resultBase,runtime:{url:runtimeUrl,httpStatus:rr.status,bytes:runtime.length,sha256:crypto.createHash('sha256').update(runtime).digest('hex')},chunksScanned:uniq.length,chunksWithHits:rows.length,highValueChunks:highValue,candidateOperationNames:ops,candidateSourceBodies:bodies,decision:{cmsQueryCandidateRecovered:ops.length>0||bodies.length>0,nextStep:(ops.length||bodies.length)?'REVIEW_EXACT_READ_ONLY_QUERY_AND_PROBE_ONLY_RECOVERED_FIELDS':'TRACE_PUBLIC_CONTENT_API_URL_FROM_BUNDLES',realMoneyAllowed:false},guards:{boundedOutput:true,publicStaticBundlesOnly:true,sameOperatorHostOnly:true,noGraphqlIntrospection:true,noMutationInvocation:true,noAuthentication:true,noCookies:true,noBetting:true,realMoneyAllowed:false}};
  persist(out);
  console.log(JSON.stringify({chunksScanned:out.chunksScanned,chunksWithHits:out.chunksWithHits,highValueChunks:highValue.map(x=>({name:x.name,hits:x.hits,operationNames:x.operationNames})),candidateOperationNames:ops,sourceBodyCount:bodies.length,decision:out.decision},null,2));
}catch(e){
  const out={...resultBase,error:String(e?.stack||e?.message||e),decision:{cmsQueryCandidateRecovered:false,nextStep:'FIX_OR_RETRY_PUBLIC_SCAN',realMoneyAllowed:false},guards:{diagnosticPersistedOnFailure:true,noBetting:true,realMoneyAllowed:false}};persist(out);console.error(out.error);process.exitCode=1;
}
