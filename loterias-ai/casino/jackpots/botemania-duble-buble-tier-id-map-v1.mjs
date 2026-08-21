#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ORIGIN='https://www.botemania.es';
const GRAPHQL=`${ORIGIN}/es/graphql`;
const PAGE=`${ORIGIN}/juegos/slots-online/duble-buble-bote-triple`;
const OUT='loterias-ai/casino/jackpots/evidence/botemania-duble-buble-tier-id-map-v1.json';
const UA='loterias-ai-duble-buble-tier-id-map/1.0';
const CANDIDATE_IDS=['bouncy_bubbles_id','GRAND','GOLD','pool1','JackpotPool','progressive_id1','JACKPOT'];

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
const literalIdHits=CANDIDATE_IDS.filter(id=>lower.includes(id.toLowerCase()));

const candidateRows=[];
for(const id of CANDIDATE_IDS){
  const before=liveRows.filter(r=>r.id===id);
  const after=liveRowsAfter.filter(r=>r.id===id);
  const values=[...new Set([...before,...after].map(r=>r.amountEUR))];
  const amountTextHits=[];
  for(const v of values){
    const hits=moneyStrings(v).filter(s=>haystack.includes(s));
    if(hits.length)amountTextHits.push({amountEUR:v,matchedStrings:hits});
  }
  candidateRows.push({id,literalFound:literalIdHits.includes(id),beforeAmountsEUR:[...new Set(before.map(x=>x.amountEUR))],afterAmountsEUR:[...new Set(after.map(x=>x.amountEUR))],amountTextHits});
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

const exactLiteralMappings=candidateRows.filter(x=>x.literalFound).map(x=>x.id);
const uniqueAmountEvidence=candidateRows.filter(x=>x.amountTextHits.length>0).map(x=>({id:x.id,hits:x.amountTextHits}));
const bouncy=candidateRows.find(x=>x.id==='bouncy_bubbles_id');
const boteMayorFeedCandidate=bouncy?.literalFound===true
  ? {id:'bouncy_bubbles_id',evidenceClass:'LITERAL_ID_ON_GAME_PUBLIC_SURFACE',verified:true}
  : bouncy?.amountTextHits?.length
    ? {id:'bouncy_bubbles_id',evidenceClass:'LIVE_AMOUNT_TEXT_MATCH_ONLY',verified:false}
    : {id:null,evidenceClass:'UNRESOLVED',verified:false};

const out={
  version:'botemania-duble-buble-tier-id-map-v1',
  generatedAt:new Date().toISOString(),
  operator:'botemania-es',
  game:{slug:'duble-buble-bote-triple',url:PAGE,providerIds:[...new Set([gameA?.providerId,gameB?.providerId].filter(Boolean))]},
  page:{httpStatus:page.status,ok:page.ok,bytes:page.text.length,sha256:page.sha256},
  graphql:{contentful:{httpStatus:contentful.httpStatus,errors:(contentful.body?.errors||[]).map(e=>String(e?.message||e)),game:gameA},pageOrGame:{httpStatus:pageOrGame.httpStatus,errors:(pageOrGame.body?.errors||[]).map(e=>String(e?.message||e)),game:gameB}},
  topology,
  liveWindow:{beforeObservedAt:new Date().toISOString(),beforeRows:liveRows,afterRows:liveRowsAfter},
  candidateRows,
  evidence:{exactLiteralMappings,uniqueAmountEvidence,boteMayorFeedCandidate},
  interpretation:{
    botemaniaTopologyVerified:topology.threePots&&topology.boteMayorSharedWithBouncy&&topology.linkedPotsResetTogether,
    allThreeTierFeedIdsVerified:false,
    boteMayorFeedIdVerified:boteMayorFeedCandidate.verified===true,
    economicThresholdVerified:false,
    executionPromotionAllowed:false,
    realMoneyAllowed:false,
    note:'Semantic names such as GRAND/GOLD are never mapped to Bote Gran/Mayor/Mini without literal or amount-linked public evidence. Amount text matches are discovery evidence only unless unique and independently cross-checked.'
  },
  guards:{publicNoAuthOnly:true,noCookies:true,noLogin:true,noIntrospection:true,noMutation:true,noGameLaunch:true,noBetting:true,noSemanticNameMappingWithoutEvidence:true,noAmountOnlyExecutionMapping:true,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({topology:out.topology,evidence:out.evidence,interpretation:out.interpretation,candidateRows:out.candidateRows},null,2));
