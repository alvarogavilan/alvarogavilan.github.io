#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ENDPOINT='https://www.botemania.es/es/graphql';
const REFERER='https://www.botemania.es/juegos/slots-online/fishin-frenzy-jackpot-king';
const VENTURE='botemania_es';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-blueprint-cap-field-probe-v1.json';
const candidates=[
  'maxAmount','maxValue','maximum','mustBeWonBy','mustBeWonByValue','threshold','cap','limit',
  'reserve','reserveAmount','seed','seedAmount','minimum','minAmount','currentValue','currency','currencyCode'
];

async function gql(query,operationName){
  const r=await fetch(ENDPOINT,{method:'POST',redirect:'follow',headers:{
    accept:'application/json','content-type':'application/json',venture:VENTURE,
    referer:REFERER,origin:'https://www.botemania.es','user-agent':'loterias-ai-botemania-cap-probe/1.0',
    'cache-control':'no-cache, no-store, max-age=0'
  },body:JSON.stringify({operationName,variables:{},query})});
  const text=await r.text();
  let body=null;try{body=JSON.parse(text);}catch{}
  return {httpStatus:r.status,contentType:r.headers.get('content-type'),sha256:crypto.createHash('sha256').update(text).digest('hex'),body,textPreview:body?null:text.slice(0,300)};
}

const baseline=await gql('query loadJackpotsCapProbeBase { blueprintJackpots { id amount } }','loadJackpotsCapProbeBase');
const baselineRows=Array.isArray(baseline.body?.data?.blueprintJackpots)?baseline.body.data.blueprintJackpots:[];
const probes=[];
for(const field of candidates){
  const op=`probe_${field}`;
  const q=`query ${op} { blueprintJackpots { id amount ${field} } }`;
  try{
    const x=await gql(q,op);
    const rows=Array.isArray(x.body?.data?.blueprintJackpots)?x.body.data.blueprintJackpots:[];
    const errors=(x.body?.errors||[]).map(e=>String(e?.message||e)).slice(0,8);
    probes.push({field,httpStatus:x.httpStatus,accepted:x.httpStatus===200&&errors.length===0&&rows.length>0,rows:rows.map(r=>({id:r?.id,amount:r?.amount,[field]:r?.[field]})),errors,responseSha256:x.sha256});
  }catch(e){probes.push({field,accepted:false,errors:[String(e?.message||e)]});}
}

const accepted=probes.filter(x=>x.accepted);
const suggestionTexts=[...new Set(probes.flatMap(x=>x.errors||[]).flatMap(s=>[...s.matchAll(/Did you mean ([^?]+)\?/g)].map(m=>m[1])) )];
const out={
  version:'botemania-blueprint-cap-field-probe-v1',generatedAt:new Date().toISOString(),endpoint:ENDPOINT,ventureHeader:VENTURE,
  scope:'PUBLIC_GRAPHQL_BLUEPRINTJACKPOTS_ONLY_LIMITED_FIELD_CANDIDATES_NO_INTROSPECTION',
  baseline:{httpStatus:baseline.httpStatus,rows:baselineRows,responseSha256:baseline.sha256},
  candidateFields:candidates,acceptedFields:accepted.map(x=>x.field),probes,schemaSuggestions:suggestionTexts,
  decision:{exactSpainCapRecovered:accepted.some(x=>/max|must|threshold|cap|limit/i.test(x.field)&&x.rows.some(r=>r[x.field]!=null)),realMoneyAllowed:false,automaticBettingAllowed:false},
  guards:{publicEndpointOnly:true,websiteVentureHeaderOnly:true,noAuthentication:true,noCookies:true,noPrivateCredentials:true,noIntrospection:true,noMutation:true,noBetting:true,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({baseline:out.baseline,acceptedFields:out.acceptedFields,schemaSuggestions:out.schemaSuggestions,decision:out.decision},null,2));