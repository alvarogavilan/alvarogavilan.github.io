#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const PAGE='https://www.botemania.es/juegos/slots-online/fishin-frenzy-jackpot-king';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jackpot-client-map-v1.json';
const headers={accept:'text/html,application/javascript,*/*','user-agent':'loterias-ai-botemania-public-client-map/1.1','cache-control':'no-cache, no-store, max-age=0'};
const pageRes=await fetch(PAGE,{redirect:'follow',headers});
const html=await pageRes.text();
const scriptUrls=[];
for(const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)){
  try{const u=new URL(m[1],pageRes.url).href;if(!scriptUrls.includes(u))scriptUrls.push(u);}catch{}
}
const runtimeUrl=scriptUrls.find(x=>/\/runtime\.[^.]+\.js(?:$|\?)/.test(x))||null;
let runtime='';
if(runtimeUrl){const r=await fetch(runtimeUrl,{headers});runtime=await r.text();}
const context=(text,needle,radius=1600)=>{
  const out=[];let from=0;
  while(true){const i=text.indexOf(needle,from);if(i<0)break;out.push(text.slice(Math.max(0,i-radius),Math.min(text.length,i+needle.length+radius)).replace(/\s+/g,' '));from=i+needle.length;if(out.length>=10)break;}
  return out;
};
const idValues=new Map();
for(const m of runtime.matchAll(/(?:^|[,;{])(?:"?(\d+)"?)\s*:\s*"([^"]+)"/g)){
  const id=Number(m[1]),v=m[2],arr=idValues.get(id)||[];if(!arr.includes(v))arr.push(v);idValues.set(id,arr);
}
const relevant=[];
for(const [id,vals] of idValues){
  const name=vals.find(v=>/(BlueprintJackpots|HeadlessJackpots)/i.test(v));
  const hash=vals.find(v=>/^[a-f0-9]{16,}$/i.test(v));
  if(name&&hash){
    const url=new URL(`${name}.${hash}.js`,'https://www.botemania.es/es/').href;
    relevant.push({id,name,hash,url});
  }
}
const chunkNames=[];for(const m of runtime.matchAll(/"([^"]*(?:BlueprintJackpots|HeadlessJackpots)[^"]*)"/g))if(!chunkNames.includes(m[1]))chunkNames.push(m[1]);
const numericHints={};for(const id of [2,23,70,119])numericHints[id]=(idValues.get(id)||[]).slice(0,20);

function querySignatures(text){
  const out=[];
  for(const re of [/\bquery\s+[A-Za-z_][A-Za-z0-9_]*/g,/\bfragment\s+[A-Za-z_][A-Za-z0-9_]*/g,/operationName["']?\s*[:=]\s*["']([A-Za-z_][A-Za-z0-9_]*)["']/g])for(const m of text.matchAll(re)){const x=m[1]||m[0];if(!out.includes(x))out.push(x);if(out.length>=80)return out;}
  return out;
}
function endpointCandidates(text,base){
  const out=[];
  for(const re of [/https?:\\?\/\\?\/[^"'<>\s]+/gi,/["'](\/[^"']*(?:jackpot|graphql|progressive|api)[^"']*)["']/gi])for(const m of text.matchAll(re)){
    const raw=(m[1]||m[0]).replace(/\\\//g,'/');
    if(!/(jackpot|graphql|progressive|\/api\/)/i.test(raw))continue;
    try{const u=new URL(raw,base).href;if(!out.includes(u))out.push(u);}catch{}
  }
  return out.slice(0,100);
}
function fieldHints(text){
  const terms=['jackpot','progressive','amount','value','pot','royal','regal','currency','jackpotKing','jackpots'];
  const out=[];
  for(const term of terms){
    const re=new RegExp(`\\b[A-Za-z_][A-Za-z0-9_]{0,40}${term}[A-Za-z0-9_]{0,40}\\b`,'gi');
    for(const m of text.matchAll(re)){if(!out.includes(m[0]))out.push(m[0]);if(out.length>=120)return out;}
  }
  return out;
}
const resolvedChunks=[];
for(const c of relevant){
  try{
    const r=await fetch(c.url,{headers});const text=await r.text();
    resolvedChunks.push({...c,status:r.status,bytes:text.length,sha256:crypto.createHash('sha256').update(text).digest('hex'),querySignatures:querySignatures(text),endpointCandidates:endpointCandidates(text,c.url),fieldHints:fieldHints(text),jackpotContexts:[...context(text,'jackpot',900),...context(text,'Jackpot',900)].slice(0,20)});
  }catch(e){resolvedChunks.push({...c,error:String(e?.message||e)});}
}
const out={
  version:'botemania-jackpot-client-map-v1.1',generatedAt:new Date().toISOString(),page:PAGE,pageStatus:pageRes.status,pageFinalUrl:pageRes.url,
  runtimeUrl,runtimeBytes:runtime.length,scriptUrls,chunkNames,numericHints,resolvedChunks,
  blueprintContexts:context(runtime,'BlueprintJackpots',2500).slice(0,3),headlessContexts:context(runtime,'HeadlessJackpots',2500).slice(0,3),
  guards:{publicClientAssetsOnly:true,noAuthenticationBypass:true,noPrivateApiCredentials:true,noGraphqlIntrospection:true,noBetting:true,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({runtimeUrl,runtimeBytes:runtime.length,relevant,resolvedChunks:resolvedChunks.map(x=>({id:x.id,name:x.name,status:x.status,bytes:x.bytes,queries:x.querySignatures,endpoints:x.endpointCandidates,fields:x.fieldHints}))},null,2));
