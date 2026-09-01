#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ENDPOINT='https://www.botemania.es/es/graphql';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-double-jackpots-mustdrop-field-probe-v1.json';
const headers={accept:'application/json','content-type':'application/json',venture:'botemania_es',origin:'https://www.botemania.es',referer:'https://www.botemania.es/','user-agent':'loterias-ai-mustdrop-field-probe/1.0','cache-control':'no-cache'};

const specs=[
  {
    name:'baselineKnownGood',
    operationName:'loadJackpots',
    query:'query loadJackpots { redTigerJackpots { id amount } }',
  },
  {
    name:'mustDropWithinFieldCandidate',
    operationName:'loadJackpotsMustDropWithin',
    query:'query loadJackpotsMustDropWithin { redTigerJackpots { id amount mustDropWithin } }',
  },
];

async function run(spec){
  try{
    const r=await fetch(ENDPOINT,{method:'POST',headers,body:JSON.stringify({operationName:spec.operationName,variables:{},query:spec.query})});
    const text=await r.text();
    let body=null;try{body=JSON.parse(text)}catch{}
    const rows=Array.isArray(body?.data?.redTigerJackpots)?body.data.redTigerJackpots.map(x=>({
      id:x?.id==null?null:String(x.id),
      amount:Number.isFinite(Number(x?.amount))?Number(x.amount):null,
      mustDropWithin:x?.mustDropWithin??null,
    })):[];
    return {
      name:spec.name,
      operationName:spec.operationName,
      query:spec.query,
      httpStatus:r.status,
      ok:r.ok,
      bytes:text.length,
      responseSha256:crypto.createHash('sha256').update(text).digest('hex'),
      errors:(body?.errors||[]).map(e=>String(e?.message||e)).slice(0,20),
      rows,
      fieldPresentInResponse:rows.some(x=>x.mustDropWithin!==null&&x.mustDropWithin!==undefined),
      rawPreview:body?null:text.slice(0,500),
    };
  }catch(e){
    return {name:spec.name,operationName:spec.operationName,query:spec.query,httpStatus:null,ok:false,bytes:0,responseSha256:null,errors:[String(e?.message||e)],rows:[],fieldPresentInResponse:false,rawPreview:null};
  }
}

const probes=[];
for(const spec of specs)probes.push(await run(spec));
const baseline=probes.find(x=>x.name==='baselineKnownGood');
const candidate=probes.find(x=>x.name==='mustDropWithinFieldCandidate');
const exactIds=['Daily','Quick Hit','Hourly'];
const candidateRows=(candidate?.rows||[]).filter(x=>exactIds.includes(x.id));
const resolvedRows=candidateRows.filter(x=>x.mustDropWithin!==null&&x.mustDropWithin!==undefined);

const out={
  version:'botemania-double-jackpots-mustdrop-field-probe-v1',
  generatedAt:new Date().toISOString(),
  operator:'botemania-es',
  purpose:'Test the exact public GraphQL field name consumed by the already-recovered DoubleJackpots UI without changing or endangering the known-good meter query.',
  evidenceBasis:{
    frontendConsumesMustDropWithin:true,
    knownUiIds:exactIds,
    baselineQueryPreserved:true,
    candidateQueryIsIndependent:true,
  },
  probes,
  exactIdRows:candidateRows,
  resolvedExactIdRows:resolvedRows,
  decision:{
    baselineReadable:Boolean(baseline?.ok&&baseline?.rows?.length),
    mustDropWithinSchemaFieldAccepted:Boolean(candidate?.ok&&!candidate?.errors?.length),
    exactMustDropWithinValuesResolved:resolvedRows.length>0,
    exactResolvedCount:resolvedRows.length,
    promotionToEvAllowed:false,
    realMoneyAllowed:false,
    nextStep:resolvedRows.length?'BIND_COUNTDOWN_SEMANTICS_AND_UNDERLYING_GAME_THEN_APPLY_FINITE_INTERVAL_MUST_DROP_EV_ENGINE':'IF_FIELD_REJECTED_TRACE_NETWORK_RESPONSE_ENRICHMENT_OR_RUNTIME_OBJECT_CONSTRUCTION',
  },
  guards:{
    noGraphqlIntrospection:true,
    knownPublicRootFieldOnly:true,
    oneCandidateChildFieldFromRecoveredFrontendOnly:true,
    noAuthentication:true,
    noCookies:true,
    noMutation:true,
    baselineMonitorUntouched:true,
    noSyntheticDeadline:true,
    noBetting:true,
    realMoneyAllowed:false,
  }
};

fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({decision:out.decision,exactIdRows:out.exactIdRows,errors:candidate?.errors||[]},null,2));
