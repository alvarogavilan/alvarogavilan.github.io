#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ORIGIN='https://www.botemania.es';
const PAGE='/juegos/casino-online/ultimate-video-poker';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-roxor-launch-operation-probe-v2.json';
const UA='loterias-ai-roxor-launch-operation-probe/2.0';
const headers={'user-agent':UA,'cache-control':'no-cache'};

async function fetchText(url,accept='*/*'){
  const r=await fetch(url,{headers:{...headers,accept},redirect:'follow',signal:AbortSignal.timeout(15000)});
  const text=await r.text();
  return {r,text};
}
function sha(text){return crypto.createHash('sha256').update(text).digest('hex');}
function decodeJsStringBody(raw){
  try{return JSON.parse(`"${raw.replace(/"/g,'\\"')}"`);}catch{}
  try{return raw.replace(/\\n/g,'\n').replace(/\\"/g,'"').replace(/\\\//g,'/').replace(/\\\\/g,'\\');}catch{return raw;}
}
function contexts(text,needle,limit=12,before=800,after=1400){
  const out=[],lower=text.toLowerCase(),n=needle.toLowerCase(); let p=0;
  while(out.length<limit){const i=lower.indexOf(n,p);if(i<0)break;out.push({needle,index:i,context:text.slice(Math.max(0,i-before),Math.min(text.length,i+n.length+after))});p=i+n.length;}
  return out;
}

const {r:pageResp,text:html}=await fetchText(`${ORIGIN}${PAGE}`,'text/html,*/*');
if(!pageResp.ok) throw new Error(`PAGE_HTTP_${pageResp.status}`);
const scriptUrls=[...new Set([...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>new URL(m[1],ORIGIN).href))];
if(!scriptUrls.length) throw new Error('NO_PAGE_SCRIPTS');

const markerNeedles=[
  'gameLaunch','launchGame','launchUrl','launchURL','gameUrl','gameURL','openGame','playGame','playUrl','playURL',
  'gameSession','sessionToken','iframeUrl','iframeURL','gameEngineId','gameEngineID','realPlay','demoPlay','game-info',
  'providerId','resourceId','contentfulGame','pageOrGame','gameFeatures'
];
const scriptResults=[];
const fetchFailures=[];
const graphqlOperations=[];
const navigationCandidates=[];
let fetchSuccess=0;

for(const url of scriptUrls){
  try{
    const {r,text}=await fetchText(url,'application/javascript,text/javascript,*/*');
    if(!r.ok){fetchFailures.push({url,httpStatus:r.status,error:`HTTP_${r.status}`});continue;}
    fetchSuccess++;
    const hits=[];
    for(const needle of markerNeedles){if(text.toLowerCase().includes(needle.toLowerCase())) hits.push(...contexts(text,needle,5));}

    // Apollo/webpack bundles commonly retain GraphQL source in loc.source.body strings.
    const bodies=[];
    for(const m of text.matchAll(/body:\s*["']((?:\\.|[^"']){20,20000})["']\s*,\s*name:\s*["']GraphQL request["']/g)){
      bodies.push(decodeJsStringBody(m[1]));
      if(bodies.length>=300)break;
    }
    // Also capture readable embedded query/mutation strings when minifier layout differs.
    for(const m of text.matchAll(/(?:query|mutation)\s+[A-Za-z_][A-Za-z0-9_]*[\s\S]{0,5000}?\}/g)){
      bodies.push(m[0]);
      if(bodies.length>=500)break;
    }
    const uniqueBodies=[...new Set(bodies)];
    for(const body of uniqueBodies){
      const opMatch=body.match(/\b(query|mutation)\s+([A-Za-z_][A-Za-z0-9_]*)/);
      const lower=body.toLowerCase();
      const relevant=/game|launch|play|session|provider|iframe/.test(lower);
      if(!relevant)continue;
      graphqlOperations.push({scriptUrl:url,type:opMatch?.[1]||null,name:opMatch?.[2]||null,hasGame:/\bgame\b|gameid|resourceid|contentfulgame|pageorgame/i.test(body),hasLaunch:/launch/i.test(body),hasPlay:/\bplay\w*/i.test(body),hasSession:/session/i.test(body),hasProvider:/provider/i.test(body),hasIframe:/iframe/i.test(body),body:body.slice(0,12000)});
    }

    // String literals that look like navigation/API paths relevant to game start.
    for(const m of text.matchAll(/["']([^"']{2,300})["']/g)){
      const s=m[1];
      if(!/(?:game|launch|play|session|iframe)/i.test(s))continue;
      if(!/(?:\/|https?:|api|graphql|launch|session|play)/i.test(s))continue;
      navigationCandidates.push({scriptUrl:url,value:s.slice(0,300)});
      if(navigationCandidates.length>=2000)break;
    }
    scriptResults.push({url,httpStatus:r.status,bytes:text.length,sha256:sha(text),markerHitCount:hits.length,markerHits:hits.slice(0,100),graphqlRelevantBodyCount:uniqueBodies.filter(x=>/game|launch|play|session|provider|iframe/i.test(x)).length});
  }catch(e){fetchFailures.push({url,httpStatus:null,error:String(e?.name||e?.message||e)});}
}

const dedupOps=[...new Map(graphqlOperations.map(x=>[`${x.name||''}|${x.body}`,x])).values()];
const dedupNav=[...new Map(navigationCandidates.map(x=>[x.value,x])).values()].slice(0,1000);
const launchLikeOps=dedupOps.filter(x=>x.hasLaunch||x.hasPlay||x.hasSession||x.hasIframe);
const gameAndLaunchLikeOps=launchLikeOps.filter(x=>x.hasGame);
const exactProviderOps=dedupOps.filter(x=>/roxor|ultimate-video-poker|jotas o mejor/i.test(x.body));
const exactProviderNav=dedupNav.filter(x=>/roxor|ultimate-video-poker|jotas|wager_bet/i.test(x.value));
const exactLaunchPathCandidates=dedupNav.filter(x=>/(launch|play|session)/i.test(x.value)&&/(game|casino)/i.test(x.value));

const out={
  version:'botemania-roxor-launch-operation-probe-v2',
  generatedAt:new Date().toISOString(),
  operator:'botemania-es',
  target:{game:'Ultimate Video Poker',variant:'Jotas o Mejor Progresivo',providerId:'roxor-gaming',monitorKey:'generic:WAGER_BET',page:`${ORIGIN}${PAGE}`},
  coverage:{pageHttpStatus:pageResp.status,pageBytes:html.length,pageSha256:sha(html),scriptsDiscovered:scriptUrls.length,scriptsFetchedSuccessfully:fetchSuccess,fetchFailureCount:fetchFailures.length,fetchFailures,coveragePct:+(100*fetchSuccess/scriptUrls.length).toFixed(3),scanComplete:fetchSuccess===scriptUrls.length&&fetchFailures.length===0},
  scriptResults,
  extracted:{graphqlRelevantOperationCount:dedupOps.length,graphqlRelevantOperations:dedupOps.slice(0,300),launchLikeOperationCount:launchLikeOps.length,launchLikeOperations:launchLikeOps.slice(0,100),gameAndLaunchLikeOperationCount:gameAndLaunchLikeOps.length,gameAndLaunchLikeOperations:gameAndLaunchLikeOps.slice(0,100),providerOrTargetSpecificOperationCount:exactProviderOps.length,providerOrTargetSpecificOperations:exactProviderOps.slice(0,100),navigationCandidateCount:dedupNav.length,navigationCandidates:dedupNav,exactProviderNavigationCandidateCount:exactProviderNav.length,exactProviderNavigationCandidates:exactProviderNav,exactLaunchPathCandidateCount:exactLaunchPathCandidates.length,exactLaunchPathCandidates:exactLaunchPathCandidates.slice(0,200)},
  decision:{publicPageClientFullyInspected:fetchSuccess===scriptUrls.length&&fetchFailures.length===0,providerSpecificLaunchReferenceFound:exactProviderOps.length>0||exactProviderNav.length>0,genericGameLaunchOperationCandidateFound:gameAndLaunchLikeOps.length>0||exactLaunchPathCandidates.length>0,exactRoxorLaunchRequestRecovered:false,exactLaunchEndpointVerified:false,providerAssetHostVerified:false,helpOrPaytableAssetRecovered:false,realMoneyAllowed:false},
  guards:{pageLoadedScriptsOnly:true,noGlobalChunkRescan:true,noAuthentication:true,noCookies:true,noGraphqlIntrospection:true,noMutationExecuted:true,noLaunchRequestExecuted:true,noBetting:true,noAutoVerificationFromKeywordHit:true,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({coverage:out.coverage,counts:{graphqlRelevantOperationCount:out.extracted.graphqlRelevantOperationCount,launchLikeOperationCount:out.extracted.launchLikeOperationCount,gameAndLaunchLikeOperationCount:out.extracted.gameAndLaunchLikeOperationCount,providerOrTargetSpecificOperationCount:out.extracted.providerOrTargetSpecificOperationCount,navigationCandidateCount:out.extracted.navigationCandidateCount,exactProviderNavigationCandidateCount:out.extracted.exactProviderNavigationCandidateCount,exactLaunchPathCandidateCount:out.extracted.exactLaunchPathCandidateCount},decision:out.decision,launchLikeOperations:out.extracted.launchLikeOperations.map(x=>({type:x.type,name:x.name,hasGame:x.hasGame,hasLaunch:x.hasLaunch,hasPlay:x.hasPlay,hasSession:x.hasSession,hasProvider:x.hasProvider,hasIframe:x.hasIframe,body:x.body.slice(0,1200)})),exactLaunchPathCandidates:out.extracted.exactLaunchPathCandidates.slice(0,30)},null,2));
