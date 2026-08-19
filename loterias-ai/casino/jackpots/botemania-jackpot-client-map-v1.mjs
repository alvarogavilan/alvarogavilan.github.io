#!/usr/bin/env node
import fs from 'node:fs';

const PAGE='https://www.botemania.es/juegos/slots-online/fishin-frenzy-jackpot-king';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-jackpot-client-map-v1.json';
const headers={accept:'text/html,application/javascript,*/*','user-agent':'loterias-ai-botemania-public-client-map/1.0','cache-control':'no-cache, no-store, max-age=0'};
const pageRes=await fetch(PAGE,{redirect:'follow',headers});
const html=await pageRes.text();
const scriptUrls=[];
for(const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)){
  try{const u=new URL(m[1],pageRes.url).href;if(!scriptUrls.includes(u))scriptUrls.push(u);}catch{}
}
const runtimeUrl=scriptUrls.find(x=>/\/runtime\.[^.]+\.js(?:$|\?)/.test(x))||null;
let runtime='';
if(runtimeUrl){const r=await fetch(runtimeUrl,{headers});runtime=await r.text();}
const context=(needle,radius=5000)=>{
  const out=[];let from=0;
  while(true){const i=runtime.indexOf(needle,from);if(i<0)break;out.push(runtime.slice(Math.max(0,i-radius),Math.min(runtime.length,i+needle.length+radius)));from=i+needle.length;if(out.length>=6)break;}
  return out;
};
const numericHints={};
for(const id of [2,23,70,119]){
  const re=new RegExp(`(?:^|[,;{])(?:"?${id}"?)\\s*:\\s*"([^"]+)"`,'g');
  const vals=[];for(const m of runtime.matchAll(re))if(!vals.includes(m[1]))vals.push(m[1]);numericHints[id]=vals.slice(0,20);
}
const chunkNames=[];
for(const m of runtime.matchAll(/"([^"]*(?:BlueprintJackpots|HeadlessJackpots)[^"]*)"/g))if(!chunkNames.includes(m[1]))chunkNames.push(m[1]);
const out={
  version:'botemania-jackpot-client-map-v1',generatedAt:new Date().toISOString(),page:PAGE,pageStatus:pageRes.status,pageFinalUrl:pageRes.url,
  runtimeUrl,runtimeBytes:runtime.length,scriptUrls,
  chunkNames,
  numericHints,
  blueprintContexts:context('BlueprintJackpots'),
  headlessContexts:context('HeadlessJackpots'),
  guards:{publicClientAssetsOnly:true,noAuthenticationBypass:true,noPrivateApiCredentials:true,noBetting:true,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({runtimeUrl,runtimeBytes:runtime.length,chunkNames,numericHints},null,2));
