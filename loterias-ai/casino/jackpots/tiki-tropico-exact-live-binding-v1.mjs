#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import { findStateBlobs, findParameterizedJackpotQuery, findLiteralIdHits } from './botemania-winfall-wishes-identity-binding-probe-v1.mjs';

const ORIGIN='https://www.botemania.es';
const GRAPHQL=`${ORIGIN}/es/graphql`;
const VENTURE='botemania_es';
const OUT='loterias-ai/casino/jackpots/evidence/tiki-tropico-exact-live-binding-v1.json';
const UA='loterias-ai-tiki-tropico-exact-live-binding/1.0';

const TARGETS=[
  {slug:'la-isla-de-tiki-tropico-dorado',role:'PRIMARY_TARGET'},
  {slug:'winfall-wishes-jackpot',role:'ZERO_RESET_CONTROL'},
  {slug:'paper-wins-jackpot',role:'ZERO_RESET_CONTROL'}
];
const IDS=['bouncy_bubbles_id','classicwildsprogressive','diamondbonanza25BTM','DealOrNoDealStateful3','tikitemple2_1','progressivealice1','pool1','JackpotPool','JACKPOT','progressive_id1','GRAND','GOLD','WAGER_BET'];
const AMBIGUOUS=new Set(['pool1','JackpotPool','JACKPOT','progressive_id1','GRAND','GOLD','WAGER_BET']);
const started=Date.now();
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');

async function fetchText(url,accept='*/*'){
  const r=await fetch(url,{headers:{accept,'user-agent':UA,'cache-control':'no-cache'},redirect:'follow',signal:AbortSignal.timeout(8000)});
  return {r,text:await r.text()};
}
async function gql(referer,slug){
  const query='query G($gameId:String!){ contentfulGame(gameId:$gameId){ id title providerId jackpot { id amount } } }';
  const r=await fetch(GRAPHQL,{method:'POST',headers:{accept:'application/json','content-type':'application/json',venture:VENTURE,referer,origin:ORIGIN,'user-agent':UA},body:JSON.stringify({query,variables:{gameId:slug}}),signal:AbortSignal.timeout(8000)});
  let body=null;try{body=JSON.parse(await r.text());}catch{}
  return {httpStatus:r.status,data:body?.data?.contentfulGame??null,errors:(body?.errors||[]).map(x=>String(x?.message||x)).slice(0,5)};
}

function collectLiteralIds(row){
  return new Set([
    ...(row.pageLiteralIdHits||[]).map(x=>x.id),
    ...(row.stateBlobLiteralIdHits||[]).map(x=>x.id),
    ...(row.scriptResults||[]).flatMap(x=>(x.literalIdHits||[]).map(y=>y.id))
  ]);
}
export function summarizeTikiBinding(rows){
  const primary=rows.find(x=>x.role==='PRIMARY_TARGET');
  const controls=rows.filter(x=>x.role!=='PRIMARY_TARGET');
  if(!primary)return {exclusiveLiteralCandidates:[],strongExclusiveCandidates:[],ambiguousExclusiveCandidates:[],parameterizedQuerySpecificToPrimary:false,identityVerified:false};
  const p=collectLiteralIds(primary);
  const c=new Set(controls.flatMap(x=>[...collectLiteralIds(x)]));
  const exclusive=[...p].filter(id=>!c.has(id));
  const strong=exclusive.filter(id=>!AMBIGUOUS.has(id));
  const ambiguous=exclusive.filter(id=>AMBIGUOUS.has(id));
  const pParam=(primary.pageParamHits||[]).length>0||(primary.scriptResults||[]).some(x=>(x.paramHits||[]).length>0);
  const cParam=controls.some(x=>(x.pageParamHits||[]).length>0||(x.scriptResults||[]).some(y=>(y.paramHits||[]).length>0));
  return {
    exclusiveLiteralCandidates:exclusive,
    strongExclusiveCandidates:strong,
    ambiguousExclusiveCandidates:ambiguous,
    parameterizedQuerySpecificToPrimary:pParam&&!cParam,
    contentfulJackpotNonNull:!!(primary.graphql?.data?.jackpot?.id||primary.graphql?.data?.jackpot?.amount),
    identityVerified:false,
    requiresSecondFrozenReplication:true
  };
}

async function probe(t){
  const url=`${ORIGIN}/juegos/slots-online/${t.slug}`;
  let html='',pageStatus=null,pageError=null;
  try{const x=await fetchText(url,'text/html,*/*');html=x.text;pageStatus=x.r.status;}catch(e){pageError=String(e?.name||e?.message||e);}
  let graph=null;try{graph=await gql(url,t.slug);}catch(e){graph={httpStatus:null,data:null,errors:[String(e?.name||e?.message||e)]};}
  const pageLiteralIdHits=html?findLiteralIdHits(html,IDS):[];
  const stateBlobs=html?findStateBlobs(html):[];
  const stateBlobLiteralIdHits=[];
  for(const b of stateBlobs){for(const hit of findLiteralIdHits(String(b.rawPreview||''),IDS))stateBlobLiteralIdHits.push(hit);}
  const pageParamHits=html?findParameterizedJackpotQuery(html):[];
  const scriptUrls=html?[...new Set([...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>new URL(m[1],ORIGIN).href))]:[];
  const scriptResults=[];const failures=[];let ok=0;
  let next=0;
  async function worker(){while(next<scriptUrls.length){const i=next++;const su=scriptUrls[i];try{const x=await fetchText(su,'application/javascript,text/javascript,*/*');if(!x.r.ok){failures.push({url:su,httpStatus:x.r.status});continue;}ok++;const literalIdHits=findLiteralIdHits(x.text,IDS);const paramHits=findParameterizedJackpotQuery(x.text);if(literalIdHits.length||paramHits.length)scriptResults.push({url:su,bytes:x.text.length,sha256:sha(x.text),literalIdHits:literalIdHits.slice(0,20),paramHits:paramHits.slice(0,10)});}catch(e){failures.push({url:su,error:String(e?.name||e?.message||e)});}}}
  await Promise.all(Array.from({length:Math.min(6,scriptUrls.length||1)},()=>worker()));
  return {slug:t.slug,role:t.role,url,page:{httpStatus:pageStatus,bytes:html.length,sha256:html?sha(html):null,error:pageError},graphql:graph,stateBlobs:stateBlobs.map(x=>({marker:x.marker,bytes:x.bytes,parsedOk:x.parsedOk})),stateBlobLiteralIdHits,pageLiteralIdHits,pageParamHits,scriptResults,coverage:{scriptsDiscovered:scriptUrls.length,scriptsFetchedSuccessfully:ok,scriptFailures:failures.length,scanComplete:ok+failures.length===scriptUrls.length,elapsedSeconds:+((Date.now()-started)/1000).toFixed(2)}};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const rows=[];
  for(const t of TARGETS)rows.push(await probe(t));
  const summary=summarizeTikiBinding(rows);
  const out={version:'tiki-tropico-exact-live-binding-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',game:{slug:'la-isla-de-tiki-tropico-dorado',publishedBaseRtpPct:95.39,publishedContributionPct:0.38,publishedKnownPct:95.77},rows,summary,decision:{exactLiveIdCandidateFound:summary.strongExclusiveCandidates.length>0||summary.parameterizedQuerySpecificToPrimary,identityVerified:false,economicPromotionAllowed:false,realMoneyAllowed:false},guards:{pageSpecificControlsMandatory:true,globalResponseNeverVerifiesIdentity:true,ambiguousGenericIdNeverSelfVerifies:true,secondFrozenReplicationRequired:true,noAuthentication:true,noCookies:true,noClicks:true,noGameLaunch:true,noBetting:true,realMoneyAllowed:false}};
  fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
  console.log(JSON.stringify({summary,decision:out.decision,coverage:rows.map(x=>({slug:x.slug,providerId:x.graphql?.data?.providerId??null,jackpot:x.graphql?.data?.jackpot??null,coverage:x.coverage}))},null,2));
}
