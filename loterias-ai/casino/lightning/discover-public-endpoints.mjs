import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const pageUrl='https://www.tracksino.com/lightning-roulette';
const out='loterias-ai/casino/lightning/evidence/public-endpoint-discovery.json';
const UA={'user-agent':'LoteriasAI-PublicEndpointAudit/1.0 (+public research; no auth bypass; no betting)'};
const page=await fetch(pageUrl,{headers:UA});
if(!page.ok)throw new Error(`Page HTTP ${page.status}`);
const html=await page.text();
const base=new URL(pageUrl);
const scripts=[...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>new URL(m[1],base).href);
const assets=[...new Set(scripts)].slice(0,12);
const corpus=[{url:pageUrl,text:html,kind:'html'}];
for(const url of assets){
  try{
    const u=new URL(url);if(u.origin!==base.origin)continue;
    const r=await fetch(url,{headers:UA});if(!r.ok)continue;
    const text=await r.text();if(text.length<=3_000_000)corpus.push({url,text,kind:'script'});
  }catch{}
}
const raw=[];
const rx=/(https?:\\?\/\\?\/[^"'`\s)]+|["'`]((?:\/|\\\/)[^"'`\s]{3,220})["'`])/g;
for(const doc of corpus){
  for(const m of doc.text.matchAll(rx)){
    const s=(m[1]||m[2]||'').replaceAll('\\/','/');
    if(!/(api|round|history|lightning|roulette)/i.test(s))continue;
    try{raw.push({foundIn:doc.url,url:new URL(s,base).href})}catch{}
  }
}
const candidates=[...new Map(raw.map(x=>[x.url,x])).values()].filter(x=>/^https:/.test(x.url)).slice(0,40);
const probes=[];
for(const c of candidates.slice(0,20)){
  try{
    const u=new URL(c.url);
    if(!['www.tracksino.com','tracksino.com'].includes(u.hostname))continue;
    const r=await fetch(c.url,{headers:{...UA,accept:'application/json,text/plain,*/*'}});
    const ct=r.headers.get('content-type')||'';
    const text=(await r.text()).slice(0,200000);
    let json=null,jsonShape=null,roundLike=false;
    if(/json/i.test(ct)||/^[\[{]/.test(text.trim())){
      try{
        json=JSON.parse(text);
        const arr=Array.isArray(json)?json:(Array.isArray(json?.data)?json.data:Array.isArray(json?.rounds)?json.rounds:null);
        jsonShape=Array.isArray(arr)?`array:${arr.length}`:(json&&typeof json==='object'?'object':typeof json);
        if(Array.isArray(arr)&&arr.length){const z=arr[0]||{};roundLike=Object.keys(z).some(k=>/(round|result|number|winner|time|date|multiplier)/i.test(k));}
      }catch{}
    }
    probes.push({url:c.url,status:r.status,contentType:ct,jsonShape,roundLike,sha256:crypto.createHash('sha256').update(text).digest('hex')});
  }catch(e){probes.push({url:c.url,error:String(e?.message||e)});}
}
const viable=probes.filter(x=>x.status===200&&x.roundLike);
const evidence={observedAt:new Date().toISOString(),source:'tracksino-public-web',scope:'PUBLIC_ENDPOINT_DISCOVERY_ONLY',pageUrl,assetsInspected:corpus.length-1,candidatesFound:candidates.length,candidates:candidates.slice(0,40),probes,viablePublicRoundLikeEndpoints:viable,roundLevelTrainingEligible:false,trainingEligible:false,paperReplayEligible:false,realMoney:false,guardrails:{authenticationBypassAttempted:false,credentialsUsed:false,publicGetOnly:true},note:'Discovery evidence only. No endpoint is admitted to the scientific corpus until exact round-level schema, chronology, completeness and provenance gates pass independently.'};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({status:'PUBLIC_ENDPOINT_DISCOVERY_OK',assetsInspected:evidence.assetsInspected,candidatesFound:evidence.candidatesFound,probes:probes.length,viableRoundLike:viable.length,trainingEligible:false,realMoney:false},null,2));
