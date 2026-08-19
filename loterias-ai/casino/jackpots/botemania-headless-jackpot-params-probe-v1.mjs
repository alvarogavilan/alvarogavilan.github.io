#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const ENDPOINT='https://www.botemania.es/es/graphql';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-headless-jackpot-params-probe-v1.json';
const headers={accept:'application/json','content-type':'application/json',venture:'botemania_es',origin:'https://www.botemania.es',referer:'https://www.botemania.es/juegos/slots-online','user-agent':'loterias-ai-headless-jackpot-params-probe/1.0'};
const query=`query BotemaniaPageComponents($path:String){ pageOrGame(path:$path){ page { title path components { type props } } } }`;
const paths=['/juegos/slots-online','/slots-online','slots-online','/','home'];
const probes=[];
for(const path of paths){
  try{
    const r=await fetch(ENDPOINT,{method:'POST',headers,body:JSON.stringify({operationName:'BotemaniaPageComponents',query,variables:{path}})});
    const text=await r.text(); let body=null;try{body=JSON.parse(text);}catch{}
    const comps=body?.data?.pageOrGame?.page?.components||[];
    const hits=[];
    for(const c of comps){
      const type=String(c?.type||'');
      const raw=typeof c?.props==='string'?c.props:JSON.stringify(c?.props??null);
      if(/jackpot|headless|blueprint/i.test(type+' '+raw)){
        let parsed=null;try{parsed=typeof c.props==='string'?JSON.parse(c.props):c.props}catch{}
        hits.push({type,props:c?.props??null,parsedProps:parsed});
      }
    }
    probes.push({path,httpStatus:r.status,pageTitle:body?.data?.pageOrGame?.page?.title||null,pagePath:body?.data?.pageOrGame?.page?.path||null,componentCount:comps.length,hits,errors:(body?.errors||[]).map(e=>String(e?.message||e)).slice(0,10),responseSha256:crypto.createHash('sha256').update(text).digest('hex')});
  }catch(e){probes.push({path,httpStatus:null,hits:[],errors:[String(e?.message||e)]});}
}
const allHits=probes.flatMap(p=>p.hits.map(h=>({path:p.path,...h})));
const candidates=[];
for(const h of allHits){
  const raw=JSON.stringify(h.parsedProps??h.props??'');
  const m={};
  for(const key of ['url','jackpotId','currency','site','env','accountId']){
    const re=new RegExp('"'+key+'"\\s*:\\s*"([^"]+)"','i'); const x=raw.match(re); if(x)m[key]=x[1];
  }
  if(Object.keys(m).length)candidates.push({path:h.path,type:h.type,params:m,rawProps:h.props});
}
const out={version:'botemania-headless-jackpot-params-probe-v1',generatedAt:new Date().toISOString(),endpoint:ENDPOINT,venture:'botemania_es',scope:'PUBLIC_PAGE_COMPONENT_PROPS_ONLY',probes,candidates,decision:{jackpotParamsRecovered:candidates.some(c=>c.params.jackpotId&&c.params.site),exactSpainMbwbRecovered:false,realMoneyAllowed:false},guards:{noIntrospection:true,noAuthentication:true,noCookies:true,noMutation:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({candidates:out.candidates,decision:out.decision},null,2));
