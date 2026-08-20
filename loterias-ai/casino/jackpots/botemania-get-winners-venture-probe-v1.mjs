#!/usr/bin/env node
import fs from 'node:fs';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-get-winners-venture-probe-v1.json';
const ENDPOINT='https://www.botemania.es/es/graphql';
const QUERY=`query getWinners($venture: String) { winners(venture: $venture) { LocaleName WinAmount GameProductSkinName ProductType PrimaryHardwareType WinTimestamp } }`;
const ventures=['botemania_es','botemania','BOTEMANIA','BOTEMANIA_ES'];
const rows=[];
for(const venture of ventures){
 try{
  const r=await fetch(ENDPOINT,{method:'POST',headers:{accept:'application/json','content-type':'application/json',venture:'botemania_es',origin:'https://www.botemania.es',referer:'https://www.botemania.es/','user-agent':'loterias-ai-get-winners-venture-probe/1.0','cache-control':'no-cache'},body:JSON.stringify({operationName:'getWinners',variables:{venture},query:QUERY})});
  const text=await r.text();let b=null;try{b=JSON.parse(text)}catch{};const ws=Array.isArray(b?.data?.winners)?b.data.winners:[];
  rows.push({venture,httpStatus:r.status,ok:r.ok,bytes:text.length,errors:(b?.errors||[]).map(e=>e?.message||null).slice(0,5),winnerRows:ws.length,sample:ws.slice(0,20)});
 }catch(e){rows.push({venture,error:String(e?.message||e)});}
}
const best=[...rows].sort((a,b)=>(b.winnerRows||0)-(a.winnerRows||0))[0]||null;
const out={version:'botemania-get-winners-venture-probe-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',scope:'EXACT_PUBLIC_READ_ONLY_QUERY_BOUNDED_PUBLIC_VENTURE_ALIASES',venturesTested:ventures,results:rows,decision:{anyWinnerRows:rows.some(x=>(x.winnerRows||0)>0),bestVenture:best?.winnerRows>0?best.venture:null,realMoneyAllowed:false},guards:{exactRecoveredQueryOnly:true,maxVentureAliases:4,noGraphqlIntrospection:true,noMutation:true,noAuthentication:true,noCookies:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
