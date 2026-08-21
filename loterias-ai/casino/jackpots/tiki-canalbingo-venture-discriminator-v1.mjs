#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ENDPOINT='https://www.botemania.es/es/graphql';
const OUT='loterias-ai/casino/jackpots/evidence/tiki-canalbingo-venture-discriminator-v1.json';
const QUERY='query loadJackpots { jackpots { id amount } }';
const TARGETS=['tikitemple2_1','progressivealice1'];
const ATTEMPTS=[
  {label:'BOTEMANIA_CONTROL',venture:'botemania_es'},
  {label:'CANAL_BINGO_A',venture:'canalbingo_es'},
  {label:'CANAL_BINGO_B',venture:'canalbingo'},
  {label:'CANAL_BINGO_C',venture:'canal_bingo_es'},
  {label:'NO_HEADER_CONTROL',venture:null}
];
const finite=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');

export function canonicalRows(rows=[]){return rows.map(x=>({id:String(x?.id??''),amountEUR:finite(x?.amountEUR??x?.amount)})).filter(x=>x.id&&x.amountEUR!==null).sort((a,b)=>a.id.localeCompare(b.id)||a.amountEUR-b.amountEUR);}
export function targetSummary(rows=[],id){const rs=canonicalRows(rows).filter(x=>x.id===id);const distinct=[...new Set(rs.map(x=>x.amountEUR))];return {rowCount:rs.length,distinctAmountsEUR:distinct,singleLiveAmount:rs.length>0&&distinct.length===1,amountEUR:distinct.length===1?distinct[0]:null};}
export function compareAttempt(control={},candidate={}){
  const controlRows=canonicalRows(control.rows||[]),candidateRows=canonicalRows(candidate.rows||[]);
  const controlFp=sha(JSON.stringify(controlRows)),candidateFp=sha(JSON.stringify(candidateRows));
  const targetComparison={};
  for(const id of TARGETS){
    const a=targetSummary(controlRows,id),b=targetSummary(candidateRows,id);
    const sameRowCount=a.rowCount===b.rowCount;
    const sameAmounts=JSON.stringify(a.distinctAmountsEUR)===JSON.stringify(b.distinctAmountsEUR);
    targetComparison[id]={control:a,candidate:b,sameRowCount,sameAmounts,incidenceDiffers:!sameRowCount||!sameAmounts};
  }
  return {controlFingerprint:controlFp,candidateFingerprint:candidateFp,fullFeedDiffers:controlFp!==candidateFp,targetComparison,anyTargetIncidenceDifference:Object.values(targetComparison).some(x=>x.incidenceDiffers)};
}

async function load(venture,label){
  const headers={accept:'application/json','content-type':'application/json',origin:'https://www.botemania.es',referer:'https://www.botemania.es/','cache-control':'no-cache, no-store, max-age=0','user-agent':'loterias-ai-tiki-canalbingo-venture-discriminator/1.0'};
  if(venture)headers.venture=venture;
  const observedAt=new Date().toISOString();
  try{
    const r=await fetch(ENDPOINT,{method:'POST',headers,body:JSON.stringify({operationName:'loadJackpots',variables:{},query:QUERY}),signal:AbortSignal.timeout(10000)});
    const text=await r.text();let body=null;try{body=JSON.parse(text)}catch{}
    const rows=canonicalRows(body?.data?.jackpots||[]);
    return {label,venture,httpStatus:r.status,ok:r.ok,observedAt,bytes:text.length,graphqlErrors:(body?.errors||[]).map(e=>String(e?.message||e)).slice(0,5),rows,rowCount:rows.length,feedFingerprintSha256:sha(JSON.stringify(rows)),targets:Object.fromEntries(TARGETS.map(id=>[id,targetSummary(rows,id)]))};
  }catch(e){return {label,venture,httpStatus:null,ok:false,observedAt,bytes:0,graphqlErrors:[String(e?.name||e?.message||e)],rows:[],rowCount:0,feedFingerprintSha256:sha('[]'),targets:Object.fromEntries(TARGETS.map(id=>[id,targetSummary([],id)]))};}
}

if(import.meta.url===`file://${process.argv[1]}`){
  const results=[];for(const a of ATTEMPTS)results.push(await load(a.venture,a.label));
  const control=results[0];
  const comparisons=results.slice(1).map(r=>({label:r.label,venture:r.venture,rowCount:r.rowCount,httpStatus:r.httpStatus,...compareAttempt(control,r)}));
  const canal=comparisons.filter(x=>String(x.label).startsWith('CANAL_BINGO'));
  const canalNonEmpty=canal.filter(x=>x.rowCount>0&&x.httpStatus===200);
  const anyCanalFullFeedDifference=canalNonEmpty.some(x=>x.fullFeedDiffers);
  const anyCanalTargetIncidenceDifference=canalNonEmpty.some(x=>x.anyTargetIncidenceDifference);
  const allNonEmptyCanalIdenticalToBotemania=canalNonEmpty.length>0&&canalNonEmpty.every(x=>!x.fullFeedDiffers&&!x.anyTargetIncidenceDifference);
  const out={version:'tiki-canalbingo-venture-discriminator-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',scope:'PUBLIC_LOADJACKPOTS_BOUNDED_VENTURE_ALIAS_DISCRIMINATION',source:{endpoint:ENDPOINT,operationName:'loadJackpots',publicNoAuth:true,canalBingoDomainCurrentState:'REDIRECTS_TO_BOTEMANIA_BINGO_PAGE'},attempts:results.map(({rows,...r})=>r),comparisons,decision:{canalAliasesWithNonEmptyFeed:canalNonEmpty.map(x=>x.venture),ventureLayerDiscriminatesFullFeed:anyCanalFullFeedDifference,ventureLayerDiscriminatesTargetPair:anyCanalTargetIncidenceDifference,allNonEmptyCanalAliasesIndistinguishableFromBotemania:allNonEmptyCanalIdenticalToBotemania,exactGameBindingRecovered:false,tikiTropicoIdentityProven:false,winfallIdentityProven:false,identityPromotionAllowed:false,economicPromotionAllowed:false,realMoneyAllowed:false},interpretation:anyCanalTargetIncidenceDifference?'At least one bounded Canal Bingo venture alias changes the exact target-pair incidence versus botemania_es. This is discovery-only and requires a uniquely explanatory game/network availability difference before any binding.':(allNonEmptyCanalIdenticalToBotemania?'The bounded Canal Bingo venture aliases that return data are indistinguishable from botemania_es for both the full feed and target pair. The venture header is not a discriminator in this layer.':'No bounded Canal Bingo alias produced an interpretable non-empty discriminating feed. This layer cannot distinguish Tiki Tropico from Winfall.'),guards:{boundedAliasesOnly:true,publicNoAuthOnly:true,noCookies:true,noLogin:true,noGameLaunch:true,http200NeverEqualsVentureRecognition:true,globalFeedNeverEqualsGameBinding:true,rowMultiplicityNeverEqualsGameIdentity:true,ventureDifferenceIsDiscoveryOnly:true,noIdentityPromotion:true,noBetting:true,realMoneyAllowed:false}};
  fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
  console.log(JSON.stringify({attempts:out.attempts,comparisons:out.comparisons,decision:out.decision,interpretation:out.interpretation},null,2));
}
