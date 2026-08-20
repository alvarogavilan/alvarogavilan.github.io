#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const ENDPOINT='https://www.botemania.es/es/graphql';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-headless-jackpots-public-probe-v1.json';
const QUERY=`query loadJackpots {
  jackpots { id amount name originalAmount }
  redTigerJackpots { id amount }
  blueprintJackpots { id amount }
}`;
const now=new Date().toISOString();
let response;
try{
  const r=await fetch(ENDPOINT,{method:'POST',headers:{accept:'application/json','content-type':'application/json',venture:'botemania_es',origin:'https://www.botemania.es',referer:'https://www.botemania.es/','user-agent':'loterias-ai-headless-jackpots-public-probe/1.0','cache-control':'no-cache'},body:JSON.stringify({operationName:'loadJackpots',variables:{},query:QUERY})});
  const text=await r.text();let body=null;try{body=JSON.parse(text)}catch{}
  const generic=Array.isArray(body?.data?.jackpots)?body.data.jackpots.map(x=>({id:String(x?.id??''),name:x?.name??null,amount:Number(x?.amount),originalAmount:Number(x?.originalAmount)})).filter(x=>x.id):[];
  const redTiger=Array.isArray(body?.data?.redTigerJackpots)?body.data.redTigerJackpots.map(x=>({id:String(x?.id??''),amount:Number(x?.amount)})).filter(x=>x.id):[];
  const blueprint=Array.isArray(body?.data?.blueprintJackpots)?body.data.blueprintJackpots.map(x=>({id:String(x?.id??''),amount:Number(x?.amount)})).filter(x=>x.id):[];
  response={httpStatus:r.status,ok:r.ok,contentType:r.headers.get('content-type'),bytes:text.length,errors:(body?.errors||[]).map(e=>e?.message||null).slice(0,10),generic,redTiger,blueprint};
}catch(e){response={httpStatus:null,ok:false,error:String(e?.message||e),generic:[],redTiger:[],blueprint:[]};}
const genericUsable=response.generic.filter(x=>Number.isFinite(x.amount)||Number.isFinite(x.originalAmount));
const seeds=genericUsable.filter(x=>Number.isFinite(x.originalAmount)).map(x=>({id:x.id,name:x.name,originalAmount:x.originalAmount,currentAmount:Number.isFinite(x.amount)?x.amount:null}));
const out={version:'botemania-headless-jackpots-public-probe-v1',generatedAt:now,operator:'botemania-es',source:{endpoint:ENDPOINT,operationName:'loadJackpots',querySha256:crypto.createHash('sha256').update(QUERY).digest('hex'),querySource:'EXACT_PUBLIC_HEADLESSJACKPOTS_BUNDLE_QUERY'},response:{httpStatus:response.httpStatus,ok:response.ok,contentType:response.contentType||null,bytes:response.bytes||0,errors:response.errors||[],error:response.error||null,genericRows:response.generic.length,redTigerRows:response.redTiger.length,blueprintRows:response.blueprint.length},jackpots:{generic:response.generic,redTiger:response.redTiger,blueprint:response.blueprint},derived:{genericRowsWithOriginalAmount:seeds.length,originalAmountCandidates:seeds},decision:{publicGenericJackpotFeedReadable:response.ok&&response.generic.length>0,originalAmountsRecovered:seeds.length>0,blueprintFeedReadable:response.ok&&response.blueprint.length>0,redTigerFeedReadable:response.ok&&response.redTiger.length>0,realMoneyAllowed:false},guards:{exactRecoveredQueryOnly:true,noGraphqlIntrospection:true,noMutation:true,noAuthentication:true,noCookies:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({response:out.response,derived:out.derived,decision:out.decision},null,2));
