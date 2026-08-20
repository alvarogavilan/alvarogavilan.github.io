#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const RUNTIME='https://www.botemania.es/es/runtime.88e5d9042d77e378fcb1.js';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jpk-lazy-chunk-feed-probe-v1.json';
const headers={accept:'application/javascript,*/*','user-agent':'loterias-ai-jpk-lazy-chunk-probe/1.0','cache-control':'no-cache'};
const r=await fetch(RUNTIME,{headers}),runtime=await r.text();
const pairs=[];for(const m of runtime.matchAll(/(\d+):["']([^"']+)["']/g))pairs.push({id:m[1],value:m[2]});
const names=new Map(),hashes=new Map();
for(const p of pairs){if(/Winners|Jackpots|Blueprint|Headless|DoubleJackpots/i.test(p.value))names.set(p.id,p.value);if(/^[a-f0-9]{16,40}$/i.test(p.value))hashes.set(p.id,p.value);}
const targets=[];
for(const [id,name] of names){const hash=hashes.get(id);if(hash)targets.push({id,name,hash,url:`https://www.botemania.es/es/${name}.${hash}.js`});}
const uniq=[...new Map(targets.map(x=>[x.url,x])).values()].slice(0,30);
const chunks=[];const operations=new Set(),fields=new Set(),contexts=[];
const terms=['winner','winners','jackpot','amount','date','history','blueprintJackpots','headlessJackpots'];
for(const t of uniq){
 try{const q=await fetch(t.url,{headers,redirect:'follow'}),text=await q.text();const hitTerms=terms.filter(x=>text.toLowerCase().includes(x.toLowerCase()));
  for(const re of [/operationName\s*[:=]\s*["']([A-Za-z0-9_]+)["']/gi,/query\s+([A-Za-z0-9_]+)\s*[({]/gi,/mutation\s+([A-Za-z0-9_]+)\s*[({]/gi])for(const m of text.matchAll(re))operations.add(m[1]);
  for(const re of [/\b([A-Za-z0-9_]*(?:winner|winners|jackpot|history)[A-Za-z0-9_]*)\b/gi])for(const m of text.matchAll(re))fields.add(m[1]);
  for(const term of hitTerms){let p=0;while(contexts.length<120){const i=text.toLowerCase().indexOf(term.toLowerCase(),p);if(i<0)break;contexts.push({chunk:t.name,term,context:text.slice(Math.max(0,i-300),Math.min(text.length,i+700))});p=i+term.length;}}
  chunks.push({...t,httpStatus:q.status,bytes:text.length,sha256:crypto.createHash('sha256').update(text).digest('hex'),hitTerms});
 }catch(e){chunks.push({...t,error:String(e?.message||e)});}
}
const ops=[...operations].filter(x=>/winner|jackpot|history|headless|blueprint/i.test(x));
const flds=[...fields].filter(x=>/winner|jackpot|history/i.test(x)).slice(0,100);
const out={version:'botemania-jpk-lazy-chunk-feed-probe-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',scope:'PUBLIC_STATIC_LAZY_CHUNKS_NO_AUTH_NO_INTROSPECTION',runtime:{url:RUNTIME,httpStatus:r.status,bytes:runtime.length,sha256:crypto.createHash('sha256').update(runtime).digest('hex')},targetsDiscovered:targets.length,chunksScanned:chunks.length,chunks,candidateOperationNames:ops,candidateFields:flds,contexts,decision:{winnerOrHistoryOperationRecovered:ops.some(x=>/winner|history/i.test(x)),jackpotOperationRecovered:ops.some(x=>/jackpot|blueprint|headless/i.test(x)),nextStep:ops.length?'PROBE_ONLY_EXPLICITLY_RECOVERED_READ_ONLY_OPERATIONS_WITH_BOUNDED_PUBLIC_FIELDS':'NO_PUBLIC_OPERATION_NAME_RECOVERED',realMoneyAllowed:false},guards:{publicStaticAssetsOnly:true,sameOperatorHostOnly:true,noAuthentication:true,noCookies:true,noGraphqlIntrospection:true,noMutationInvocation:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({targets:uniq.map(x=>x.name),operations:ops,fields:flds,decision:out.decision},null,2));
