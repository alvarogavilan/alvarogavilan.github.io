#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const OUT='loterias-ai/casino/jackpots/evidence/botemania-headless-global-bundle-config-scan-v1.json';
const ORIGIN='https://www.botemania.es';
const UA='loterias-ai-headless-global-bundle-config-scan/1.0';
const headers={accept:'text/html,application/javascript,*/*','user-agent':UA,'cache-control':'no-cache'};

const home=await fetch(`${ORIGIN}/`,{headers,redirect:'follow'});
const homeText=await home.text();
const runtimeMatch=homeText.match(/(?:src=["'])([^"']*\/runtime\.[a-f0-9]+\.js)/i);
const runtimeUrl=runtimeMatch ? new URL(runtimeMatch[1],ORIGIN).href : `${ORIGIN}/es/runtime.88e5d9042d77e378fcb1.js`;
const rr=await fetch(runtimeUrl,{headers:{...headers,accept:'application/javascript,*/*'},redirect:'follow'});
const runtime=await rr.text();

const pairs=[];
for(const m of runtime.matchAll(/(\d+):["']([^"']+)["']/g)) pairs.push({id:m[1],value:m[2]});
const names=new Map(),hashes=new Map();
for(const p of pairs){
  if(/^[a-f0-9]{16,40}$/i.test(p.value)) hashes.set(p.id,p.value);
  else if(/[A-Za-z]/.test(p.value)) names.set(p.id,p.value);
}
const all=[];
for(const [id,name] of names){
  const hash=hashes.get(id); if(!hash) continue;
  all.push({id,name,hash,url:`${ORIGIN}/es/${name}.${hash}.js`});
}
const uniq=[...new Map(all.map(x=>[x.url,x])).values()]
  .filter(x=>/^[a-z0-9~_.-]+$/i.test(x.name))
  .slice(0,260);

const needles=['jackpotsParams','headless-jackpots-bff','jackpotId','accountId','HeadlessJackpots','jackpot-config/info','baseContributionOption'];
const hitRows=[]; let cursor=0;
async function worker(){
  while(true){
    const i=cursor++; if(i>=uniq.length) return;
    const c=uniq[i];
    try{
      const r=await fetch(c.url,{headers:{...headers,accept:'application/javascript,*/*'},redirect:'follow'});
      const text=await r.text();
      const hits=needles.filter(n=>text.includes(n));
      if(!hits.length) continue;
      const contexts=[];
      for(const n of hits){
        let p=0,count=0;
        while(count<12){
          const at=text.indexOf(n,p); if(at<0) break;
          contexts.push({needle:n,index:at,context:text.slice(Math.max(0,at-1800),Math.min(text.length,at+4200))});
          p=at+n.length; count++;
        }
      }
      hitRows.push({...c,httpStatus:r.status,bytes:text.length,sha256:crypto.createHash('sha256').update(text).digest('hex'),hits,contexts});
    }catch(e){hitRows.push({...c,error:String(e?.message||e),hits:[]});}
  }
}
await Promise.all(Array.from({length:12},()=>worker()));

const candidateObjects=[];
const kv=[];
for(const row of hitRows){
  for(const x of row.contexts||[]){
    const ctx=x.context;
    for(const m of ctx.matchAll(/(?:url|jackpotId|currency|site|env|accountId)\s*[:=]\s*["']([^"']{1,220})["']/g)){
      kv.push({chunk:row.name,needle:x.needle,key:m[0].split(/[:=]/)[0].trim(),value:m[1]});
    }
    for(const m of ctx.matchAll(/\{[^{}]{0,1800}jackpotId[^{}]{0,1800}\}/g)) candidateObjects.push({chunk:row.name,text:m[0].slice(0,2200)});
  }
}
const dedupe=a=>[...new Map(a.map(x=>[JSON.stringify(x),x])).values()];
const objects=dedupe(candidateObjects).map(o=>({
  ...o,
  botemaniaHint:/botemania/i.test(o.text),
  eurHint:/currency\s*[:=]\s*["']EUR["']/i.test(o.text),
  defaultStarspinsHint:/starspins|npe00|currency\s*[:=]\s*["']GBP["']/i.test(o.text)
}));
const kvHints=dedupe(kv).slice(0,500);
const botemaniaSpecific=objects.filter(x=>(x.botemaniaHint||x.eurHint)&&!x.defaultStarspinsHint);

const out={
  version:'botemania-headless-global-bundle-config-scan-v1',
  generatedAt:new Date().toISOString(),operator:'botemania-es',
  runtime:{url:runtimeUrl,httpStatus:rr.status,bytes:runtime.length,sha256:crypto.createHash('sha256').update(runtime).digest('hex')},
  chunksDiscovered:uniq.length,chunksWithRelevantHits:hitRows.length,
  hitChunks:hitRows.map(x=>({id:x.id,name:x.name,url:x.url,httpStatus:x.httpStatus,bytes:x.bytes,sha256:x.sha256,hits:x.hits,error:x.error||null,contexts:x.contexts||[]})),
  candidateObjects:objects,kvHints,
  decision:{
    botemaniaSpecificHeadlessConfigRecovered:botemaniaSpecific.length>0,
    botemaniaSpecificCandidates:botemaniaSpecific,
    nextStep:botemaniaSpecific.length?'VERIFY_CANDIDATE_CONFIG_READ_ONLY':'TRACE_CMS_COMPONENT_PROPS_OR_PUBLIC_CONTENT_PAYLOAD',
    realMoneyAllowed:false
  },
  guards:{publicStaticBundlesOnly:true,sameOperatorHostOnly:true,maxChunks:260,noAuthentication:true,noCookies:true,noGraphqlIntrospection:true,noMutation:true,noBetting:true,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({runtime:out.runtime,chunksDiscovered:out.chunksDiscovered,chunksWithRelevantHits:out.chunksWithRelevantHits,candidateObjects:objects.length,botemaniaSpecificCandidates:botemaniaSpecific,decision:out.decision},null,2));
