#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ORIGIN='https://www.botemania.es';
const GRAPHQL=`${ORIGIN}/es/graphql`;
const SITEMAP=`${ORIGIN}/es/sitemap.xml`;
const ALL_GAMES=`${ORIGIN}/juegos/todos-los-juegos`;
const LIVE='loterias-ai/edge-live/evidence/botemania-all-network-live-state-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-dond-stateful3-availability-probe-v1.json';
const UA='loterias-ai-dond-stateful3-availability/1.1';
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const textHeaders={accept:'text/html,application/xml,*/*','user-agent':UA,'cache-control':'no-cache'};
const gqlHeaders={accept:'application/json','content-type':'application/json',venture:'botemania_es',origin:ORIGIN,referer:ALL_GAMES,'user-agent':UA};

async function boundedText(url,ms=15000){
  const r=await fetch(url,{headers:textHeaders,redirect:'follow',signal:AbortSignal.timeout(ms)});
  const text=await r.text();
  return {status:r.status,ok:r.ok,finalUrl:r.url,text,sha256:crypto.createHash('sha256').update(text).digest('hex')};
}
async function gql(gameId){
  const query='query G($gameId:String!){ contentfulGame(gameId:$gameId){ id title link providerId authorName categoryId subCategoryId imageSlug howToPlay jackpot { id amount } } }';
  const r=await fetch(GRAPHQL,{method:'POST',headers:gqlHeaders,body:JSON.stringify({query,variables:{gameId}}),signal:AbortSignal.timeout(12000)});
  const raw=await r.text();
  let body=null;try{body=JSON.parse(raw)}catch{}
  return {gameId,httpStatus:r.status,data:body?.data?.contentfulGame??null,errors:(body?.errors||[]).map(e=>String(e?.message||e)).slice(0,10),responseSha256:crypto.createHash('sha256').update(raw).digest('hex')};
}
function meaningfulGame(data){
  if(!data||typeof data!=='object')return false;
  return [data.id,data.title,data.link,data.providerId,data.authorName,data.imageSlug,data?.jackpot?.id].some(v=>typeof v==='string'&&v.trim().length>0);
}

const live=read(LIVE)||{};
const liveRow=live?.currentByKey?.['generic:DealOrNoDealStateful3']||null;
const candidateIds=['DealOrNoDealStateful3','dealornodealstateful3','deal-or-no-deal-stateful3','deal-or-no-deal-stateful-3','deal-or-no-deal','deal-no-deal'];

const sm=await boundedText(SITEMAP);
if(!sm.ok) throw new Error(`SITEMAP_HTTP_${sm.status}`);
const sitemapUrls=[...new Set([...sm.text.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/gi)].map(m=>m[1].replace(/&amp;/g,'&')))];
const gameUrls=sitemapUrls.filter(u=>/\/juegos\/(slots-online|casino-online)\//.test(u));
const dondUrls=gameUrls.filter(u=>{const s=u.toLowerCase();return s.includes('deal-or-no-deal')||s.includes('dealornodeal')||s.includes('deal-no-deal')||s.includes('stateful3');});

const all=await boundedText(ALL_GAMES);
if(!all.ok) throw new Error(`ALL_GAMES_HTTP_${all.status}`);
const lowerAll=all.text.toLowerCase();
const catalogueTerms={exactFeedId:lowerAll.includes('dealornodealstateful3'),dealOrNoDeal:lowerAll.includes('deal or no deal'),dealNoDeal:lowerAll.includes('deal no deal'),stateful3:lowerAll.includes('stateful3')};

const graphql=[];
for(const id of candidateIds){
  try{graphql.push(await gql(id));}
  catch(e){graphql.push({gameId:id,httpStatus:null,data:null,errors:[String(e?.name||e?.message||e)]});}
}
const recoveredGames=graphql.filter(x=>meaningfulGame(x.data));
const nullShellCount=graphql.filter(x=>x.data&&typeof x.data==='object'&&!meaningfulGame(x.data)).length;
const exactFeedLiteralRecovered=recoveredGames.some(x=>JSON.stringify(x.data).toLowerCase().includes('dealornodealstateful3'));
const exactPublicGameUrlRecovered=dondUrls.length===1||recoveredGames.some(x=>typeof x.data?.link==='string'&&x.data.link.trim().length>0);
const publicCataloguePresence=Object.values(catalogueTerms).some(Boolean)||dondUrls.length>0||recoveredGames.length>0;
const currentBotemaniaPlayableGameVerified=publicCataloguePresence&&exactPublicGameUrlRecovered;

const out={
  version:'botemania-dond-stateful3-availability-probe-v1.1-null-shell-safe',generatedAt:new Date().toISOString(),operator:'botemania-es',
  target:{monitorKey:'generic:DealOrNoDealStateful3',feedId:'DealOrNoDealStateful3',liveAmountEUR:Number.isFinite(Number(liveRow?.amountEUR))?Number(liveRow.amountEUR):null,liveObservedAt:live?.observedAt||null},
  sitemap:{httpStatus:sm.status,totalLocs:sitemapUrls.length,gameUrls:gameUrls.length,matchingUrls:dondUrls,fullCurrentGameUrlListChecked:true,sha256:sm.sha256},
  allGamesCatalogue:{httpStatus:all.status,finalUrl:all.finalUrl,termPresence:catalogueTerms,sha256:all.sha256},
  graphql:{candidateIds,probes:graphql,recoveredGameCount:recoveredGames.length,nullShellCount,recoveredGames:recoveredGames.map(x=>({candidateGameId:x.gameId,...x.data}))},
  interpretation:{publicCataloguePresence,exactPublicGameUrlRecovered,exactFeedLiteralRecovered,currentBotemaniaPlayableGameVerified,liveNetworkMeterMayExistWithoutCurrentBotemaniaGame:true,executionPromotionAllowed:false,realMoneyAllowed:false,verdict:currentBotemaniaPlayableGameVerified?'PUBLIC_GAME_CANDIDATE_RECOVERED_NEEDS_IDENTITY_CROSS_MATCH':'CURRENT_BOTEMANIA_PUBLIC_GAME_ACCESS_NOT_RECOVERED',note:'A moving shared-network meter is not evidence that a currently playable Botemania game exposing that meter exists. Null GraphQL shells are explicitly not counted as recovered games.'},
  guards:{publicSourcesOnly:true,noAuthentication:true,noCookies:true,noIntrospection:true,noMutation:true,noLaunch:true,noBetting:true,liveMeterDoesNotEqualPlayableGame:true,nullGraphqlShellIsNotRecoveredGame:true,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({target:out.target,sitemap:out.sitemap,allGamesCatalogue:out.allGamesCatalogue,graphql:{recoveredGameCount:out.graphql.recoveredGameCount,nullShellCount:out.graphql.nullShellCount,recoveredGames:out.graphql.recoveredGames},interpretation:out.interpretation},null,2));
