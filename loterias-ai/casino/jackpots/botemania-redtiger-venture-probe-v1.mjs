#!/usr/bin/env node
import fs from 'node:fs';
const ENDPOINT='https://www.botemania.es/es/graphql';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-redtiger-venture-probe-v1.json';
const QUERY=`query loadJackpots { redTigerJackpots { id amount } }`;
const ventures=['botemania_es','botemania','BOTEMANIA','BOTEMANIA_ES'];
const results=[];
for(const venture of ventures){
  try{
    const r=await fetch(ENDPOINT,{method:'POST',headers:{accept:'application/json','content-type':'application/json',venture,origin:'https://www.botemania.es',referer:'https://www.botemania.es/','user-agent':'loterias-ai-redtiger-venture-probe/1.0','cache-control':'no-cache'},body:JSON.stringify({operationName:'loadJackpots',variables:{},query:QUERY})});
    const text=await r.text();let body=null;try{body=JSON.parse(text)}catch{}
    const rows=Array.isArray(body?.data?.redTigerJackpots)?body.data.redTigerJackpots.map(x=>({id:String(x?.id||''),amount:Number(x?.amount)})).filter(x=>x.id&&Number.isFinite(x.amount)):[];
    results.push({venture,httpStatus:r.status,ok:r.ok,bytes:text.length,errors:(body?.errors||[]).map(e=>e?.message||null).slice(0,5),jackpotRows:rows.length,jackpots:rows.slice(0,20)});
  }catch(e){results.push({venture,error:String(e?.message||e)});}
}
const best=[...results].sort((a,b)=>(b.jackpotRows||0)-(a.jackpotRows||0))[0]||null;
const out={version:'botemania-redtiger-venture-probe-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',scope:'EXACT_RECOVERED_READ_ONLY_QUERY_BOUNDED_PUBLIC_VENTURE_HEADERS',venturesTested:ventures,results,decision:{anyRows:results.some(x=>(x.jackpotRows||0)>0),bestVenture:best?.jackpotRows>0?best.venture:null,realMoneyAllowed:false},guards:{exactRecoveredQueryOnly:true,maxVentureAliases:4,noGraphqlIntrospection:true,noMutation:true,noAuthentication:true,noCookies:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
