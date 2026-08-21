#!/usr/bin/env node
import fs from 'node:fs';

const TARGET='https://www.virgingames.com/category/casino?game-info=play-ultimate-video-poker';
const OUT='loterias-ai/edge-live/evidence/ultimate-video-poker-virgin-public-page-probe-v1.json';
const MAX_PAGE_BYTES=2_000_000;
const MAX_SCRIPT_BYTES=2_000_000;
const MAX_SCRIPTS=25;
const TERMS=[
  'ultimate video poker','play-ultimate-video-poker','jacks or better','jacks','progressive','paytable','pay table',
  'royal flush','denomination','coin','credit','wager','bet per hand','launch','game-info','roxor','gamesys','west pier','westpier'
];

function boundedText(text,max){
  text=String(text||'');
  return text.length>max?text.slice(0,max):text;
}

async function fetchText(url,timeoutMs,maxBytes){
  const started=Date.now();
  try{
    const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(timeoutMs),headers:{accept:'text/html,application/javascript,text/javascript,*/*','user-agent':'Mozilla/5.0 EDGE-Research/1.0'}});
    const raw=await r.text();
    const text=boundedText(raw,maxBytes);
    return{ok:r.ok,status:r.status,url:r.url,contentType:r.headers.get('content-type'),elapsedMs:Date.now()-started,bytesRead:raw.length,truncated:raw.length>text.length,text};
  }catch(e){
    return{ok:false,status:null,url,contentType:null,elapsedMs:Date.now()-started,bytesRead:0,truncated:false,text:'',error:String(e?.name||'Error')+': '+String(e?.message||e).slice(0,180)};
  }
}

function scriptUrlsFromHtml(html,base){
  const out=[];
  const re=/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
  for(const m of html.matchAll(re)){
    try{
      const u=new URL(m[1],base).href;
      if(!out.includes(u))out.push(u);
    }catch{}
    if(out.length>=MAX_SCRIPTS)break;
  }
  return out;
}

function snippetsForTerms(text){
  const lower=String(text||'').toLowerCase(),hits=[];
  for(const term of TERMS){
    let from=0,count=0;
    while(count<3){
      const i=lower.indexOf(term,from);
      if(i<0)break;
      hits.push({term,index:i,snippet:String(text).slice(Math.max(0,i-120),Math.min(text.length,i+term.length+180)).replace(/\s+/g,' ').slice(0,420)});
      from=i+term.length;
      count++;
    }
  }
  return hits;
}

function absoluteUrls(text){
  const s=String(text||''),out=[];
  let i=0;
  while(i<s.length&&out.length<80){
    const h=s.indexOf('http',i);
    if(h<0)break;
    if(!(s.startsWith('http://',h)||s.startsWith('https://',h))){i=h+4;continue;}
    let j=h;
    while(j<s.length&&!/[\s"'<>\\]/.test(s[j])&&j-h<600)j++;
    const u=s.slice(h,j).replace(/[),;]+$/,'');
    try{new URL(u);if(!out.includes(u))out.push(u);}catch{}
    i=Math.max(j,h+5);
  }
  return out;
}

async function run(){
  const generatedAt=new Date().toISOString();
  const page=await fetchText(TARGET,10_000,MAX_PAGE_BYTES);
  const base=page.url||TARGET;
  const scripts=page.ok?scriptUrlsFromHtml(page.text,base):[];
  const results=await Promise.all(scripts.map(async url=>{
    const r=await fetchText(url,6_000,MAX_SCRIPT_BYTES);
    const hits=r.text?snippetsForTerms(r.text):[];
    return{url,status:r.status,ok:r.ok,elapsedMs:r.elapsedMs,bytesRead:r.bytesRead,truncated:r.truncated,error:r.error||null,hitCount:hits.length,hits,absoluteUrlCandidates:r.text?absoluteUrls(r.text).filter(u=>/poker|casino|game|launch|asset|content|config|rule|help/i.test(u)).slice(0,30):[]};
  }));
  const pageHits=snippetsForTerms(page.text);
  const allHits=[...pageHits.map(x=>({source:'PAGE',...x})),...results.flatMap(r=>r.hits.map(x=>({source:r.url,...x})))];
  const lowerHits=allHits.map(x=>`${x.term} ${x.snippet}`.toLowerCase()).join('\n');
  const technicalTerms={
    exactSlugFound:lowerHits.includes('play-ultimate-video-poker')||String(page.text).toLowerCase().includes('play-ultimate-video-poker'),
    ultimateVideoPokerFound:lowerHits.includes('ultimate video poker'),
    jacksOrBetterFound:lowerHits.includes('jacks or better'),
    progressiveFound:lowerHits.includes('progressive'),
    paytableTermFound:lowerHits.includes('paytable')||lowerHits.includes('pay table'),
    royalFlushFound:lowerHits.includes('royal flush'),
    denominationFound:lowerHits.includes('denomination'),
    creditFound:lowerHits.includes('credit'),
    launchFound:lowerHits.includes('launch'),
    roxorFound:lowerHits.includes('roxor'),
    gamesysFound:lowerHits.includes('gamesys')
  };
  const successful=results.filter(x=>x.ok).length;
  const failures=results.length-successful;
  const out={
    version:'ultimate-video-poker-virgin-public-page-probe-v1',generatedAt,target:TARGET,
    page:{status:page.status,ok:page.ok,finalUrl:page.url,elapsedMs:page.elapsedMs,bytesRead:page.bytesRead,truncated:page.truncated,error:page.error||null,hitCount:pageHits.length,hits:pageHits,absoluteUrlCandidates:absoluteUrls(page.text).filter(u=>/poker|casino|game|launch|asset|content|config|rule|help/i.test(u)).slice(0,50)},
    coverage:{directScriptsDiscovered:scripts.length,directScriptsAttempted:results.length,directScriptsFetchedSuccessfully:successful,fetchFailureCount:failures,coveragePct:results.length?100*successful/results.length:(page.ok?100:0),maxScripts:MAX_SCRIPTS,globalRuntimeChunkScanPerformed:false},
    directScripts:results,
    technicalTerms,
    interpretation:{
      exactBotemaniaConfigurationRecovered:false,
      exactGamesysJacksProgressivePaytableRecovered:false,
      exactProgressiveTriggerRecovered:false,
      exactDenominationRecovered:false,
      exactQualifyingStakeRecovered:false,
      exactLaunchRequestRecovered:false,
      providerConfigurationEquivalenceVerified:false,
      economicPromotionAllowed:false,
      realMoneyAllowed:false,
      note:'This probe inspects only the exact public Virgin Games URL linked by West Pier Gaming and scripts loaded directly by that page. It never logs in, executes launch mutations, or scans unrelated runtime chunks.'
    }
  };
  fs.mkdirSync('loterias-ai/edge-live/evidence',{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
  console.log(JSON.stringify({page:out.page,coverage:out.coverage,technicalTerms:out.technicalTerms,interpretation:out.interpretation},null,2));
}

await run();
