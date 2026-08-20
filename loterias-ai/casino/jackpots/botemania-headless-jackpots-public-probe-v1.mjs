#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const ENDPOINT='https://www.botemania.es/es/graphql';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-headless-jackpots-public-probe-v1.json';
// Deliberately request only fields that the public schema has already accepted.
const QUERY=`query loadJackpots {
  jackpots { id amount }
  redTigerJackpots { id amount }
  blueprintJackpots { id amount }
}`;
const now=new Date().toISOString();
let response;
try{
  const r=await fetch(ENDPOINT,{method:'POST',headers:{accept:'application/json','content-type':'application/json',venture:'botemania_es',origin:'https://www.botemania.es',referer:'https://www.botemania.es/','user-agent':'loterias-ai-headless-jackpots-public-probe/1.1-minimal','cache-control':'no-cache'},body:JSON.stringify({operationName:'loadJackpots',variables:{},query:QUERY})});
  const text=await r.text();let body=null;try{body=JSON.parse(text)}catch{}
  const mapRows=a=>Array.isArray(a)?a.map(x=>({id:String(x?.id??''),amountEUR:Number(x?.amount)})).filter(x=>x.id&&Number.isFinite(x.amountEUR)):[];
  response={httpStatus:r.status,ok:r.ok,contentType:r.headers.get('content-type'),bytes:text.length,errors:(body?.errors||[]).map(e=>e?.message||null).filter(Boolean).slice(0,10),generic:mapRows(body?.data?.jackpots),redTiger:mapRows(body?.data?.redTigerJackpots),blueprint:mapRows(body?.data?.blueprintJackpots)};
}catch(e){response={httpStatus:null,ok:false,error:String(e?.message||e),generic:[],redTiger:[],blueprint:[]};}
const out={version:'botemania-headless-jackpots-public-probe-v1.1-minimal-readable-fields',generatedAt:now,operator:'botemania-es',source:{endpoint:ENDPOINT,operationName:'loadJackpots',querySha256:crypto.createHash('sha256').update(QUERY).digest('hex'),queryPolicy:'ONLY_FIELDS_ALREADY_ACCEPTED_BY_PUBLIC_SCHEMA'},response:{httpStatus:response.httpStatus,ok:response.ok,contentType:response.contentType||null,bytes:response.bytes||0,errors:response.errors||[],error:response.error||null,genericRows:response.generic.length,redTigerRows:response.redTiger.length,blueprintRows:response.blueprint.length},jackpots:{generic:response.generic,redTiger:response.redTiger,blueprint:response.blueprint},decision:{publicGenericJackpotFeedReadable:response.ok&&response.generic.length>0,blueprintFeedReadable:response.ok&&response.blueprint.length>0,redTigerFeedReadable:response.ok&&response.redTiger.length>0,anyNonBlueprintLiveFeedReadable:response.ok&&(response.generic.length>0||response.redTiger.length>0),realMoneyAllowed:false},guards:{noGraphqlIntrospection:true,noMutation:true,noAuthentication:true,noCookies:true,noUnsupportedFieldGuessing:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({response:out.response,decision:out.decision,jackpots:out.jackpots},null,2));
