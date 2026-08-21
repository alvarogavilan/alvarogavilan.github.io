#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ORIGIN='https://www.botemania.es';
const GRAPHQL=`${ORIGIN}/es/graphql`;
const PAGE=`${ORIGIN}/juegos/slots-online/duble-buble-bote-triple`;
const OUT='loterias-ai/casino/jackpots/evidence/botemania-duble-buble-tier-id-map-v1.json';
const UA='loterias-ai-duble-buble-tier-id-map/1.1';
const CANDIDATE_IDS=['bouncy_bubbles_id','GRAND','GOLD','pool1','JackpotPool','progressive_id1','JACKPOT'];
// Generic English jackpot words occur naturally in rules/schema and are not
// distinctive enough to prove a feed ID. Only identifiers with a distinctive
// token shape may qualify for literal-ID evidence.
const LITERAL_ID_ELIGIBLE=new Set(['bouncy_bubbles_id','pool1','JackpotPool','progressive_id1']);
const SEMANTIC_GENERIC_IDS=new Set(['GRAND','GOLD','JACKPOT']);

async function req(url,opts={}){
  try{
    const r=await fetch(url,{...opts,signal:AbortSignal.timeout(12000),redirect:'follow'});
    const text=await r.text();
    return {ok:r.ok,status:r.status,url:r.url,text,sha256:crypto.createHash('sha256').update(text).digest('hex'),error:null};
  }catch(e){return {ok:false,status:null,url,text:'',sha256:null,error:String(e?.name||e?.message||e)};}
}
async function gql(query,variables={}){
  const r=await req(GRAPHQL,{method:'POST',headers:{accept:'application/json','content-type':'application/json',venture:'botemania_es',origin:ORIGIN,referer:PAGE,'user-agent':UA,'cache-control':'no-cache'},body:JSON.stringify({query,variables})});
  let body=null;try{body=JSON.parse(r.text)}catch{}
  return {httpStatus:r.status,ok:r.ok,body,sha256:r.sha256,error:r.error};
}
const moneyStrings=n=>{
  if(!Number.isFinite(n))return[];
  const f=n.toFixed(2);
  const comma=f.replace('.',',');
  const es=new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
  return [...new Set([f,comma,es,`${f} €`,`${comma} €`,`${es} €`])];
};
const compact=s=>String(s||'').replace(/\s+/g,' ').slice(0,300000);
const distinctAmounts=(rows,id)=>[...new Set(rows.filter(r=>r.id===id).map(r=>r.amountEUR))];

const liveQ='query loadJackpots { jackpots { id amount } }';
const liveBefore=await gql(liveQ);
const liveRows=(liveBefore.body?.data?.jackpots||[]).map(x=>({id:String(x?.id??''),amountEUR:Number(x?.amount)})).filter(x=>x.id&&Number.isFinite(x.amountEUR));

const page=await req(PAGE,{headers:{accept:'text/html,*/*','user-agent':UA,'cache-control':'no-cache'}});
const fields='id title providerId categoryId imageSlug howToPlay jackpot { id amount }';
const contentful=await gql(`query G($gameId:String!){ contentfulGame(gameId:$gameId){ ${fields} } }`,{gameId:'duble-buble-bote-triple'});
const pageOrGame=await gql(`query P($path:String){ pageOrGame(path:$path){ game { ${fields} } } }`,{path:'/juegos/slots-online/duble-buble-bote-triple'});
const liveAfter=await gql(liveQ);
const liveRowsAfter=(liveAfter.body?.data?.jackpots||[]).map(x=>({id:String(x?.id??''),amountEUR:Number(x?.amount)})).filter(x=>x.id&&Number.isFinite(x.amountEUR));

const gameA=contentful.body?.data?.contentfulGame||null;
const gameB=pageOrGame.body?.data?.pageOrGame?.game||null;
const haystack=[page.text,JSON.stringify(gameA||{}),JSON.stringify(gameB||{})].join('\n');
const lower=haystack.toLowerCase();

const candidateRows=[];
for(const id of CANDIDATE_IDS){
  const beforeAmountsEUR=distinctAmounts(liveRows,id);
  const afterAmountsEUR=distinctAmounts(liveRowsAfter,id);
  const sameSnapshotAmbiguous=beforeAmountsEUR.length>1||afterAmountsEUR.length>1;
  const literalEligible=LITERAL_ID_ELIGIBLE.has(id);
  const rawLiteralFound=lower.includes(id.toLowerCase());
  const literalFound=literalEligible&&rawLiteralFound&&!sameSnapshotAmbiguous;
  const values=[...new Set([...beforeAmountsEUR,...afterAmountsEUR])];
  const amountTextHits=[];
  for(const v of values){
    const hits=moneyStrings(v).filter(s=>haystack.includes(s));
    if(hits.length)amountTextHits.push({amountEUR:v,matchedStrings:hits});
  }
  candidateRows.push({
    id,
    literalEligible,
    semanticGenericId:SEMANTIC_GENERIC_IDS.has(id),
    rawLiteralFound,
    literalFound,
    sameSnapshotAmbiguous,
    identityState:sameSnapshotAmbiguous?'QUARANTINED_SAME_ID_MULTIPLE_AMOUNTS':literalFound?'DISTINCTIVE_LITERAL_CANDIDATE':'UNRESOLVED',
    beforeAmountsEUR,
    afterAmountsEUR,
    amountTextHits
  });
}

const how=[gameA?.howToPlay,gameB?.howToPlay].filter(Boolean).join(' ');
const text=compact(how).replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ');
const low=text.toLowerCase();
const topology={
  threePots:low.includes('tres botes progresivos')||low.includes('tres botes'),
  boteGranMentions:low.includes('bote gran'),
  boteMayorMentions:low.includes('bote mayor'),
  boteMiniMentions:low.includes('bote mini'),
  boteMayorSharedWithBouncy:low.includes('bote mayor')&&low.includes('compartido con burbujas saltarinas'),
  linkedPotsResetTogether:(low.includes('reiniciarán en su valor inicial a la vez')||low.includes('reiniciaran en su valor inicial a la vez')),
  rtp9151:low.includes('91,51')||low.includes('91.51'),
  contribution049:low.includes('0,49')||low.includes('0.49')
};

const exactLiteralMappings=candidateRows.filter(x=>x.literalFound&&x.sameSnapshotAmbiguous===false).map(x=>x.id);
const quarantinedFeedIds=candidateRows.filter(x=>x.sameSnapshotAmbiguous).map(x=>x.id);
const semanticFalsePositiveHits=candidateRows.filter(x=>x.semanticGenericId&&x.rawLiteralFound).map(x=>x.id);
const uniqueAmountEvidence=candidateRows.filter(x=>x.amountTextHits.length>0&&!x.sameSnapshotAmbiguous).map(x=>({id:x.id,hits:x.amountTextHits}));
const bouncy=candidateRows.find(x=>x.id==='bouncy_bubbles_id');
const boteMayorFeedCandidate=bouncy?.literalFound===true
  ? {id:'bouncy_bubbles_id',evidenceClass:'DISTINCTIVE_LITERAL_ID_ON_GAME_PUBLIC_SURFACE',verified:true}
  : bouncy?.amountTextHits?.length&&!bouncy?.sameSnapshotAmbiguous
    ? {id:'bouncy_bubbles_id',evidenceClass:'LIVE_AMOUNT_TEXT_MATCH_ONLY',verified:false}
    : {id:null,evidenceClass:'UNRESOLVED',verified:false};

const out={
  version:'botemania-duble-buble-tier-id-map-v1.1-semantic-literal-guard',
  generatedAt:new Date().toISOString(),
  operator:'botemania-es',
  game:{slug:'duble-buble-bote-triple',url:PAGE,providerIds:[...new Set([gameA?.providerId,gameB?.providerId].filter(Boolean))]},
  page:{httpStatus:page.status,ok:page.ok,bytes:page.text.length,sha256:page.sha256},
  graphql:{contentful:{httpStatus:contentful.httpStatus,errors:(contentful.body?.errors||[]).map(e=>String(e?.message||e)),game:gameA},pageOrGame:{httpStatus:pageOrGame.httpStatus,errors:(pageOrGame.body?.errors||[]).map(e=>String(e?.message||e)),game:gameB}},
  topology,
  liveWindow:{beforeObservedAt:new Date().toISOString(),beforeRows:liveRows,afterRows:liveRowsAfter},
  candidateRows,
  evidence:{exactLiteralMappings,quarantinedFeedIds,semanticFalsePositiveHits,uniqueAmountEvidence,boteMayorFeedCandidate},
  interpretation:{
    botemaniaTopologyVerified:topology.threePots&&topology.boteMayorSharedWithBouncy&&topology.linkedPotsResetTogether,
    allThreeTierFeedIdsVerified:false,
    boteMayorFeedIdVerified:boteMayorFeedCandidate.verified===true,
    economicThresholdVerified:false,
    executionPromotionAllowed:false,
    realMoneyAllowed:false,
    note:'GRAND/GOLD/JACKPOT are semantic words and can never be literal-ID proof merely because those words occur in rules or GraphQL field names. Any raw feed ID with multiple distinct amounts in one snapshot is quarantined. Amount text matches are discovery evidence only unless unique and independently cross-checked.'
  },
  guards:{publicNoAuthOnly:true,noCookies:true,noLogin:true,noIntrospection:true,noMutation:true,noGameLaunch:true,noBetting:true,noSemanticNameMappingWithoutEvidence:true,semanticGenericWordsNeverLiteralProof:true,sameIdMultipleAmountsQuarantined:true,noAmountOnlyExecutionMapping:true,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({topology:out.topology,evidence:out.evidence,interpretation:out.interpretation,candidateRows:out.candidateRows},null,2));
