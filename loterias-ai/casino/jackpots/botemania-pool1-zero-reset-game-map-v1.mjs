#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ORIGIN='https://www.botemania.es';
const GRAPHQL=`${ORIGIN}/es/graphql`;
const OUT='loterias-ai/casino/jackpots/evidence/botemania-pool1-zero-reset-game-map-v1.json';
const UA='loterias-ai-pool1-zero-reset-game-map/1.1';
const FEED_QUERY='query loadJackpots { jackpots { id amount } }';
const TARGET_ID='pool1';
const TARGETS=[
  {slug:'winfall-wishes-jackpot',networkHint:'WINFALL_WONDERLAND_TIKI_SHARED_ZERO_RESET'},
  {slug:'wonderland',networkHint:'WINFALL_WONDERLAND_TIKI_SHARED_ZERO_RESET'},
  {slug:'la-isla-de-tiki',networkHint:'WINFALL_WONDERLAND_TIKI_SHARED_ZERO_RESET'},
  {slug:'boteman',networkHint:'BOTEMAN_PAPER_TIKI_BOTE_WINSTONES_SHARED_ZERO_RESET'},
  {slug:'paper-wins-jackpot',networkHint:'BOTEMAN_PAPER_TIKI_BOTE_WINSTONES_SHARED_ZERO_RESET'},
  {slug:'la-isla-de-tiki-bote',networkHint:'BOTEMAN_PAPER_TIKI_BOTE_WINSTONES_SHARED_ZERO_RESET'},
  {slug:'winstones-bote',networkHint:'BOTEMAN_PAPER_TIKI_BOTE_WINSTONES_SHARED_ZERO_RESET'},
  {slug:'la-isla-de-tiki-tropico-dorado',networkHint:'BOTEMAN_PAPER_TIKI_BOTE_WINSTONES_SHARED_ZERO_RESET'},
  {slug:'bote-de-secretos-del-fenix',networkHint:'PHOENIX_CROSS_OPERATOR_ZERO_RESET'},
  {slug:'duble-buble-bote-triple',networkHint:'DUBLE_BUBLE_THREE_TIER_LINKED_RESET'}
];
const finiteOrNull=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;};

async function request(url,opts={}){
  try{
    const r=await fetch(url,{...opts,redirect:'follow',signal:AbortSignal.timeout(12000)});
    const text=await r.text();
    return {ok:r.ok,status:r.status,url:r.url,text,sha256:crypto.createHash('sha256').update(text).digest('hex'),error:null};
  }catch(e){return {ok:false,status:null,url,text:'',sha256:null,error:String(e?.name||e?.message||e)};}
}
async function gql(query,variables={},referer=`${ORIGIN}/juegos/todos-los-juegos`){
  const r=await request(GRAPHQL,{method:'POST',headers:{accept:'application/json','content-type':'application/json',venture:'botemania_es',origin:ORIGIN,referer,'cache-control':'no-cache, no-store, max-age=0','user-agent':UA},body:JSON.stringify({query,variables})});
  let body=null;try{body=JSON.parse(r.text)}catch{}
  return {httpStatus:r.status,ok:r.ok,body,error:r.error,sha256:r.sha256};
}
const feedRows=body=>(body?.data?.jackpots||[]).map(x=>({id:String(x?.id??''),amountEUR:finiteOrNull(x?.amount)})).filter(x=>x.id&&x.amountEUR!==null);
const distinct=(rows,id)=>[...new Set(rows.filter(x=>x.id===id).map(x=>x.amountEUR))];
const moneyStrings=n=>{if(!Number.isFinite(n))return[];const f=n.toFixed(2),c=f.replace('.',','),es=new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);return[...new Set([f,c,es,`${f} €`,`${c} €`,`${es} €`])];};
const clean=s=>String(s||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();
const usableJackpot=j=>{
  if(!j||typeof j!=='object')return null;
  const id=j.id==null?null:String(j.id).trim()||null;
  const amountEUR=finiteOrNull(j.amount);
  if(id===null&&amountEUR===null)return null;
  return {id,amountEUR};
};

const before=await gql(FEED_QUERY);
const beforeRows=feedRows(before.body);
const beforePool=distinct(beforeRows,TARGET_ID);

const fields='id title providerId categoryId imageSlug howToPlay jackpot { id amount }';
const games=[];
for(const target of TARGETS){
  const pageUrl=`${ORIGIN}/juegos/slots-online/${target.slug}`;
  const [content,pageOrGame,page]=await Promise.all([
    gql(`query G($gameId:String!){ contentfulGame(gameId:$gameId){ ${fields} } }`,{gameId:target.slug},pageUrl),
    gql(`query P($path:String){ pageOrGame(path:$path){ game { ${fields} } } }`,{path:`/juegos/slots-online/${target.slug}`},pageUrl),
    request(pageUrl,{headers:{accept:'text/html,*/*','cache-control':'no-cache, no-store, max-age=0','user-agent':UA}})
  ]);
  const a=content.body?.data?.contentfulGame||null;
  const b=pageOrGame.body?.data?.pageOrGame?.game||null;
  const html=page.text||'';
  const combined=[html,JSON.stringify(a||{}),JSON.stringify(b||{})].join('\n');
  const graphJackpots=[usableJackpot(a?.jackpot),usableJackpot(b?.jackpot)].filter(Boolean);
  const poolLiteral=combined.toLowerCase().includes(TARGET_ID.toLowerCase());
  const poolAmountTextHits=[];
  for(const v of beforePool){const hits=moneyStrings(v).filter(s=>combined.includes(s));if(hits.length)poolAmountTextHits.push({amountEUR:v,matchedStrings:hits});}
  const text=clean([a?.howToPlay,b?.howToPlay].filter(Boolean).join(' '));
  const low=text.toLowerCase();
  games.push({
    slug:target.slug,networkHint:target.networkHint,pageUrl,
    page:{httpStatus:page.status,ok:page.ok,sha256:page.sha256},
    graphql:{contentfulHttpStatus:content.httpStatus,pageOrGameHttpStatus:pageOrGame.httpStatus,contentfulGame:a?{id:a.id,title:a.title,providerId:a.providerId,jackpot:a.jackpot}:null,pageOrGame:b?{id:b.id,title:b.title,providerId:b.providerId,jackpot:b.jackpot}:null,usableJackpotObjects:graphJackpots},
    identityDiscovery:{pool1LiteralFound:poolLiteral,pool1CurrentAmountTextHits:poolAmountTextHits},
    rules:{mentionsResetZero:(low.includes('reinicia desde los 0')||low.includes('reinicia desde 0')||low.includes('establece en 0 €')||low.includes('partió de 0 €')||low.includes('partio de 0 €')),mentionsSharedPool:low.includes('compartido con'),mentionsResetTogether:low.includes('reiniciarán')&&low.includes('a la vez'),howToPlayPresent:text.length>0}
  });
}

const after=await gql(FEED_QUERY);
const afterRows=feedRows(after.body);
const afterPool=distinct(afterRows,TARGET_ID);
const exactGraphqlIdMatches=[];
const exactGraphqlAmountMatches=[];
for(const g of games){
  for(const j of g.graphql.usableJackpotObjects){
    if(j.id===TARGET_ID) exactGraphqlIdMatches.push({slug:g.slug,jackpot:j});
    if(j.amountEUR!==null&&[...beforePool,...afterPool].some(v=>Math.round(v*100)===Math.round(j.amountEUR*100))) exactGraphqlAmountMatches.push({slug:g.slug,jackpot:j});
  }
}
const literalPageMatches=games.filter(g=>g.identityDiscovery.pool1LiteralFound).map(g=>g.slug);
const amountPageMatches=games.filter(g=>g.identityDiscovery.pool1CurrentAmountTextHits.length>0).map(g=>({slug:g.slug,hits:g.identityDiscovery.pool1CurrentAmountTextHits}));
const poolUniqueBefore=beforePool.length===1;
const poolUniqueAfter=afterPool.length===1;
const poolCurrentEUR=poolUniqueAfter?afterPool[0]:poolUniqueBefore?beforePool[0]:null;

const out={
  version:'botemania-pool1-zero-reset-game-map-v1.1-null-safe',generatedAt:new Date().toISOString(),operator:'botemania-es',target:{network:'generic',id:TARGET_ID},
  liveWindow:{before:{httpStatus:before.httpStatus,targetDistinctAmountsEUR:beforePool,uniqueIdentityInSnapshot:poolUniqueBefore},after:{httpStatus:after.httpStatus,targetDistinctAmountsEUR:afterPool,uniqueIdentityInSnapshot:poolUniqueAfter},currentPool1EUR:poolCurrentEUR},
  games,
  evidence:{exactGraphqlIdMatches,exactGraphqlAmountMatches,literalPageMatches,amountPageMatches},
  interpretation:{
    exactGameMappingVerified:exactGraphqlIdMatches.length===1,
    exactGameMapping:exactGraphqlIdMatches.length===1?exactGraphqlIdMatches[0]:null,
    candidateDiscoveryOnly:[...new Set([...exactGraphqlAmountMatches.map(x=>x.slug),...literalPageMatches,...amountPageMatches.map(x=>x.slug)])],
    noMatchMeansPublicKnownFieldsExhaustedForTheseTargets:exactGraphqlIdMatches.length===0&&exactGraphqlAmountMatches.length===0&&literalPageMatches.length===0&&amountPageMatches.length===0,
    economicPromotionAllowed:false,realMoneyAllowed:false,
    note:'Only an exact jackpot.id=pool1 response can directly verify a game mapping in this probe. Same-cent amounts or page literals are discovery evidence only because shared assets, duplicated values and sequential meter movement can create false associations. Null/empty GraphQL jackpot shells are discarded, never converted to zero.'
  },
  guards:{targetedKnownGamesOnly:true,publicNoAuthOnly:true,noCookies:true,noIntrospection:true,noMutation:true,noGameLaunch:true,noBetting:true,nullGraphqlJackpotNotEvidence:true,nullNeverCoercedToZero:true,emptyJackpotIdNotEvidence:true,amountMatchDiscoveryOnly:true,pageLiteralDiscoveryOnly:true,noSharedNetworkHintAsIdentityProof:true,noEconomicPromotion:true,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({liveWindow:out.liveWindow,evidence:out.evidence,interpretation:out.interpretation,games:games.map(g=>({slug:g.slug,graphql:g.graphql,identityDiscovery:g.identityDiscovery,rules:g.rules}))},null,2));
