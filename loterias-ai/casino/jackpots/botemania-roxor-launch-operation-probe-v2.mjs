#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ORIGIN='https://www.botemania.es';
const PAGE='/juegos/casino-online/ultimate-video-poker';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-roxor-launch-operation-probe-v2.json';
const UA='loterias-ai-roxor-launch-operation-probe/2.0';
const headers={'user-agent':UA,'cache-control':'no-cache'};

async function fetchText(url,accept='*/*'){
  const r=await fetch(url,{headers:{...headers,accept},redirect:'follow',signal:AbortSignal.timeout(8000)});
  const text=await r.text();
  return {r,text};
}
// The GitHub Actions job has a hard 12-minute timeout. v1 of this fix bounded
// per-request time (AbortSignal.timeout) and total wall-clock time inside the
// per-script fetch loop, but the run that was supposed to exercise that fix
// instead produced ZERO console output before being cancelled at exactly the
// job's own timeout - meaning something hung completely silently, most likely
// before the per-script loop was ever reached (the initial single page fetch
// has no such bound), and/or AbortSignal.timeout did not actually cut off a
// hung connection in this environment. Other Botemania-fetching scripts in
// this same repo succeeded from GitHub Actions in the exact same time window,
// so this is not a blanket network block - it is specific to this script's
// own request(s). Rather than trust AbortSignal alone again, this version
// adds (a) a hard top-level watchdog via Promise.race + setTimeout, which is
// independent of fetch's internal cancellation machinery and WILL fire, and
// writes whatever partial evidence exists rather than leaving nothing behind
// if it wins the race; and (b) stderr progress breadcrumbs at every stage so
// a future hang is diagnosable from the job log instead of silent.
const WALL_CLOCK_BUDGET_MS=9*60*1000;
const WATCHDOG_MS=10*60*1000; // safety margin under the 12-minute job timeout
const startedAt=Date.now();
function progress(msg){console.error(`[${((Date.now()-startedAt)/1000).toFixed(1)}s] ${msg}`);}

async function mapWithConcurrency(items,limit,worker,onProgress){
  const results=new Array(items.length);
  let next=0,done=0,budgetExceeded=false;
  async function runOne(){
    while(next<items.length){
      if(Date.now()-startedAt>WALL_CLOCK_BUDGET_MS){budgetExceeded=true;return;}
      const i=next++;
      results[i]=await worker(items[i],i);
      done++;
      if(onProgress&&done%10===0)onProgress(done,items.length);
    }
  }
  await Promise.all(Array.from({length:Math.min(limit,items.length)},runOne));
  return {results:results.filter(Boolean),budgetExceeded};
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

// The real cancelled run's own progress log proved the top-level watchdog
// NEVER fired even though it should have at the 10-minute mark - the only
// way a plain setTimeout can fail to fire is a fully blocked Node event
// loop, which only synchronous CPU-bound work (not a hung network I/O
// promise) can cause. The two regexes this replaced both ran unbounded
// matchAll over full multi-hundred-KB minified script text with nested/
// alternating quantifiers ((?:\\.|[^"']){20,20000} and [\s\S]{0,5000}?),
// both classic catastrophic-backtracking shapes. These replacements use only
// native indexOf/lastIndexOf (linear, no backtracking) plus single-character
// regex tests and hard-capped bounded windows, so worst-case cost per anchor
// is a small constant regardless of file size.
function extractGraphqlBodiesNearAnchor(text,maxResults=300){
  const bodies=[],anchor='"GraphQL request"';
  let searchFrom=0;
  while(bodies.length<maxResults){
    const anchorIdx=text.indexOf(anchor,searchFrom);
    if(anchorIdx<0)break;
    searchFrom=anchorIdx+anchor.length;
    const windowStart=Math.max(0,anchorIdx-21000);
    const window=text.slice(windowStart,anchorIdx);
    const bodyKeyIdx=window.lastIndexOf('body:');
    if(bodyKeyIdx<0)continue;
    let i=bodyKeyIdx+5;
    while(i<window.length&&(window[i]===' '||window[i]==='\t'))i++;
    const quote=window[i];
    if(quote!=='"'&&quote!=="'")continue;
    i++;
    const strStart=i;
    let escaped=false,closed=false;
    while(i<window.length&&i-strStart<20000){
      const ch=window[i];
      if(escaped){escaped=false;i++;continue;}
      if(ch==='\\'){escaped=true;i++;continue;}
      if(ch===quote){closed=true;break;}
      i++;
    }
    if(!closed)continue;
    const raw=window.slice(strStart,i);
    if(raw.length>=20)bodies.push(decodeJsStringBody(raw));
  }
  return bodies;
}
function extractQueryMutationSnippets(text,maxResults=500){
  const bodies=[];
  for(const kw of ['query','mutation']){
    let from=0;
    while(bodies.length<maxResults){
      const idx=text.indexOf(kw,from);
      if(idx<0)break;
      from=idx+kw.length;
      if(!/\s/.test(text[idx+kw.length]||''))continue;
      let j=idx+kw.length;
      while(j<text.length&&j-idx<50&&/\s/.test(text[j]))j++;
      if(!/[A-Za-z_]/.test(text[j]||''))continue;
      let k=j;
      while(k<text.length&&k-j<200&&/[A-Za-z0-9_]/.test(text[k]))k++;
      const searchEnd=Math.min(text.length,k+5000);
      const closeIdx=text.indexOf('}',k);
      if(closeIdx<0||closeIdx>searchEnd)continue;
      bodies.push(text.slice(idx,closeIdx+1));
    }
  }
  return bodies;
}

const markerNeedles=[
  'gameLaunch','launchGame','launchUrl','launchURL','gameUrl','gameURL','openGame','playGame','playUrl','playURL',
  'gameSession','sessionToken','iframeUrl','iframeURL','gameEngineId','gameEngineID','realPlay','demoPlay','game-info',
  'providerId','resourceId','contentfulGame','pageOrGame','gameFeatures'
];

// Shared mutable state, declared outside main() so the watchdog branch can
// still see and persist whatever partial progress was made if it wins the race.
const state={
  pageResp:null,html:'',scriptUrls:[],
  scriptResults:[],fetchFailures:[],graphqlOperations:[],navigationCandidates:[],
  fetchSuccess:0,budgetExceeded:false,mainCompleted:false,
};

async function main(){
  progress(`fetching UVP page ${ORIGIN}${PAGE}`);
  const {r:pageResp,text:html}=await fetchText(`${ORIGIN}${PAGE}`,'text/html,*/*');
  state.pageResp=pageResp;state.html=html;
  if(!pageResp.ok) throw new Error(`PAGE_HTTP_${pageResp.status}`);
  progress(`page fetched: ${html.length} bytes, http ${pageResp.status}`);
  const scriptUrls=[...new Set([...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>new URL(m[1],ORIGIN).href))];
  state.scriptUrls=scriptUrls;
  if(!scriptUrls.length) throw new Error('NO_PAGE_SCRIPTS');
  progress(`discovered ${scriptUrls.length} page-loaded scripts`);

  const {budgetExceeded}=await mapWithConcurrency(scriptUrls,6,async(url)=>{
    try{
      const {r,text}=await fetchText(url,'application/javascript,text/javascript,*/*');
      if(!r.ok){state.fetchFailures.push({url,httpStatus:r.status,error:`HTTP_${r.status}`});return;}
      state.fetchSuccess++;
      const hits=[];
      for(const needle of markerNeedles){if(text.toLowerCase().includes(needle.toLowerCase())) hits.push(...contexts(text,needle,5));}

      // Apollo/webpack bundles commonly retain GraphQL source in loc.source.body strings.
      const bodies=[...extractGraphqlBodiesNearAnchor(text),...extractQueryMutationSnippets(text)];
      const uniqueBodies=[...new Set(bodies)];
      for(const body of uniqueBodies){
        const opMatch=body.match(/\b(query|mutation)\s+([A-Za-z_][A-Za-z0-9_]*)/);
        const lower=body.toLowerCase();
        const relevant=/game|launch|play|session|provider|iframe/.test(lower);
        if(!relevant)continue;
        state.graphqlOperations.push({scriptUrl:url,type:opMatch?.[1]||null,name:opMatch?.[2]||null,hasGame:/\bgame\b|gameid|resourceid|contentfulgame|pageorgame/i.test(body),hasLaunch:/launch/i.test(body),hasPlay:/\bplay\w*/i.test(body),hasSession:/session/i.test(body),hasProvider:/provider/i.test(body),hasIframe:/iframe/i.test(body),body:body.slice(0,12000)});
      }

      // String literals that look like navigation/API paths relevant to game start.
      for(const m of text.matchAll(/["']([^"']{2,300})["']/g)){
        const s=m[1];
        if(!/(?:game|launch|play|session|iframe)/i.test(s))continue;
        if(!/(?:\/|https?:|api|graphql|launch|session|play)/i.test(s))continue;
        state.navigationCandidates.push({scriptUrl:url,value:s.slice(0,300)});
        if(state.navigationCandidates.length>=2000)break;
      }
      state.scriptResults.push({url,httpStatus:r.status,bytes:text.length,sha256:sha(text),markerHitCount:hits.length,markerHits:hits.slice(0,100),graphqlRelevantBodyCount:uniqueBodies.filter(x=>/game|launch|play|session|provider|iframe/i.test(x)).length});
    }catch(e){state.fetchFailures.push({url,httpStatus:null,error:String(e?.name||e?.message||e)});}
  },(done,total)=>progress(`scripts processed: ${done}/${total}`));
  state.budgetExceeded=budgetExceeded;
  state.mainCompleted=true;
  progress(`main loop complete: ${state.fetchSuccess} ok, ${state.fetchFailures.length} failed, budgetExceeded=${budgetExceeded}`);
}

function buildAndWriteEvidence(extraDecision={}){
  const {pageResp,html,scriptUrls,scriptResults,fetchFailures,graphqlOperations,navigationCandidates,fetchSuccess,budgetExceeded,mainCompleted}=state;
  const dedupOps=[...new Map(graphqlOperations.map(x=>[`${x.name||''}|${x.body}`,x])).values()];
  const dedupNav=[...new Map(navigationCandidates.map(x=>[x.value,x])).values()].slice(0,1000);
  const launchLikeOps=dedupOps.filter(x=>x.hasLaunch||x.hasPlay||x.hasSession||x.hasIframe);
  const gameAndLaunchLikeOps=launchLikeOps.filter(x=>x.hasGame);
  const exactProviderOps=dedupOps.filter(x=>/roxor|ultimate-video-poker|jotas o mejor/i.test(x.body));
  const exactProviderNav=dedupNav.filter(x=>/roxor|ultimate-video-poker|jotas|wager_bet/i.test(x.value));
  const exactLaunchPathCandidates=dedupNav.filter(x=>/(launch|play|session)/i.test(x.value)&&/(game|casino)/i.test(x.value));
  const total=scriptUrls.length;
  const scanComplete=mainCompleted&&!budgetExceeded&&fetchSuccess===total&&fetchFailures.length===0;

  const out={
    version:'botemania-roxor-launch-operation-probe-v2',
    generatedAt:new Date().toISOString(),
    operator:'botemania-es',
    target:{game:'Ultimate Video Poker',variant:'Jotas o Mejor Progresivo',providerId:'roxor-gaming',monitorKey:'generic:WAGER_BET',page:`${ORIGIN}${PAGE}`},
    coverage:{
      pageHttpStatus:pageResp?.status??null,pageBytes:html.length,pageSha256:html?sha(html):null,
      scriptsDiscovered:total,scriptsFetchedSuccessfully:fetchSuccess,fetchFailureCount:fetchFailures.length,fetchFailures,
      scriptsSkippedDueToWallClockBudget:total-fetchSuccess-fetchFailures.length,
      wallClockBudgetExceeded:budgetExceeded,
      mainLoopCompleted:mainCompleted,
      timedOutBeforeCompletion:!mainCompleted,
      coveragePct:total>0?+(100*fetchSuccess/total).toFixed(3):0,
      scanComplete,
    },
    scriptResults,
    extracted:{graphqlRelevantOperationCount:dedupOps.length,graphqlRelevantOperations:dedupOps.slice(0,300),launchLikeOperationCount:launchLikeOps.length,launchLikeOperations:launchLikeOps.slice(0,100),gameAndLaunchLikeOperationCount:gameAndLaunchLikeOps.length,gameAndLaunchLikeOperations:gameAndLaunchLikeOps.slice(0,100),providerOrTargetSpecificOperationCount:exactProviderOps.length,providerOrTargetSpecificOperations:exactProviderOps.slice(0,100),navigationCandidateCount:dedupNav.length,navigationCandidates:dedupNav,exactProviderNavigationCandidateCount:exactProviderNav.length,exactProviderNavigationCandidates:exactProviderNav,exactLaunchPathCandidateCount:exactLaunchPathCandidates.length,exactLaunchPathCandidates:exactLaunchPathCandidates.slice(0,200)},
    decision:{publicPageClientFullyInspected:scanComplete,providerSpecificLaunchReferenceFound:exactProviderOps.length>0||exactProviderNav.length>0,genericGameLaunchOperationCandidateFound:gameAndLaunchLikeOps.length>0||exactLaunchPathCandidates.length>0,exactRoxorLaunchRequestRecovered:false,exactLaunchEndpointVerified:false,providerAssetHostVerified:false,helpOrPaytableAssetRecovered:false,realMoneyAllowed:false,negativeResultInterpretableAsCompleteScan:scanComplete,...extraDecision},
    guards:{pageLoadedScriptsOnly:true,noGlobalChunkRescan:true,noAuthentication:true,noCookies:true,noGraphqlIntrospection:true,noMutationExecuted:true,noLaunchRequestExecuted:true,noBetting:true,noAutoVerificationFromKeywordHit:true,realMoneyAllowed:false}
  };
  fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
  console.log(JSON.stringify({coverage:out.coverage,counts:{graphqlRelevantOperationCount:out.extracted.graphqlRelevantOperationCount,launchLikeOperationCount:out.extracted.launchLikeOperationCount,gameAndLaunchLikeOperationCount:out.extracted.gameAndLaunchLikeOperationCount,providerOrTargetSpecificOperationCount:out.extracted.providerOrTargetSpecificOperationCount,navigationCandidateCount:out.extracted.navigationCandidateCount,exactProviderNavigationCandidateCount:out.extracted.exactProviderNavigationCandidateCount,exactLaunchPathCandidateCount:out.extracted.exactLaunchPathCandidateCount},decision:out.decision,launchLikeOperations:out.extracted.launchLikeOperations.map(x=>({type:x.type,name:x.name,hasGame:x.hasGame,hasLaunch:x.hasLaunch,hasPlay:x.hasPlay,hasSession:x.hasSession,hasProvider:x.hasProvider,hasIframe:x.hasIframe,body:x.body.slice(0,1200)})),exactLaunchPathCandidates:out.extracted.exactLaunchPathCandidates.slice(0,30)},null,2));
}

let watchdogTimer;
const watchdog=new Promise((resolve)=>{watchdogTimer=setTimeout(()=>resolve('WATCHDOG'),WATCHDOG_MS);});
const winner=await Promise.race([main().then(()=>'MAIN_DONE').catch((e)=>{progress(`main() threw: ${String(e?.message||e)}`);return 'MAIN_ERROR';}),watchdog]);
// Promise.race does not cancel the losing side. If main() finished first, the
// watchdog's setTimeout is still pending and would keep the Node process
// alive for up to WATCHDOG_MS - clear it explicitly so the script can exit.
clearTimeout(watchdogTimer);

if(winner==='WATCHDOG'){
  progress('WATCHDOG fired before main() finished - writing partial evidence honestly (timedOutBeforeCompletion=true) instead of leaving nothing for GitHub Actions to cancel silently.');
  buildAndWriteEvidence({timedOutBeforeCompletion:true});
  process.exitCode=0; // an honest partial result is not a script crash
}else if(winner==='MAIN_ERROR'){
  buildAndWriteEvidence({scriptThrew:true});
  process.exitCode=1;
}else{
  buildAndWriteEvidence();
}
