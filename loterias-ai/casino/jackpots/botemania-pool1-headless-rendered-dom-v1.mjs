#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';

const ORIGIN='https://www.botemania.es';
const GRAPHQL=`${ORIGIN}/es/graphql`;
const OUT='loterias-ai/casino/jackpots/evidence/botemania-pool1-headless-rendered-dom-v1.json';
const TARGET_ID='pool1';
const UA='loterias-ai-pool1-headless-rendered-dom/1.0';
const FEED_QUERY='query loadJackpots { jackpots { id amount } }';
const TARGETS=['winfall-wishes-jackpot','wonderland','la-isla-de-tiki','boteman','paper-wins-jackpot','la-isla-de-tiki-bote','winstones-bote','la-isla-de-tiki-tropico-dorado','bote-de-secretos-del-fenix','duble-buble-bote-triple'];
const AMBIGUOUS_IDS=new Set(['JACKPOT','JackpotPool','progressive_id1']);
const sha=s=>crypto.createHash('sha256').update(String(s||'')).digest('hex');
const finiteOrNull=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;};

async function request(url,opts={}){
  try{
    const r=await fetch(url,{...opts,redirect:'follow',signal:AbortSignal.timeout(12000)});
    const text=await r.text();
    return {ok:r.ok,status:r.status,url:r.url,text,sha256:sha(text),error:null};
  }catch(e){return {ok:false,status:null,url,text:'',sha256:null,error:String(e?.name||e?.message||e)};}
}
async function gqlFeed(){
  const r=await request(GRAPHQL,{method:'POST',headers:{accept:'application/json','content-type':'application/json',venture:'botemania_es',origin:ORIGIN,referer:`${ORIGIN}/`,'cache-control':'no-cache, no-store, max-age=0','user-agent':UA},body:JSON.stringify({operationName:'loadJackpots',variables:{},query:FEED_QUERY})});
  let body=null;try{body=JSON.parse(r.text)}catch{}
  const rows=(body?.data?.jackpots||[]).map(x=>({id:String(x?.id??'').trim(),amountEUR:finiteOrNull(x?.amount)})).filter(x=>x.id&&x.amountEUR!==null);
  return {observedAt:new Date().toISOString(),httpStatus:r.status,rows};
}
function distinct(rows,id){return [...new Set(rows.filter(x=>x.id===id).map(x=>x.amountEUR))];}
function canonicalSingleAmounts(rows){
  const by=new Map();
  for(const r of rows){if(!by.has(r.id))by.set(r.id,new Set());by.get(r.id).add(r.amountEUR);}
  return [...by.entries()].filter(([,s])=>s.size===1).map(([id,s])=>({id,amountEUR:[...s][0],ambiguousId:AMBIGUOUS_IDS.has(id)}));
}
function findChrome(){
  const env=process.env.CHROME_BIN;
  const candidates=[env,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
  for(const c of candidates){try{if(fs.existsSync(c))return c;}catch{}}
  for(const cmd of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){
    const w=spawnSync('which',[cmd],{encoding:'utf8'});if(w.status===0&&w.stdout.trim())return w.stdout.trim();
  }
  return null;
}
function visibleText(html){return String(html||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&euro;|&#8364;/gi,'€').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();}
function parseEuroNumber(raw){
  let s=String(raw||'').replace(/\s/g,'').replace(/€/g,'');
  if(!s)return null;
  if(s.includes(',')&&s.includes('.')){
    if(s.lastIndexOf(',')>s.lastIndexOf('.'))s=s.replace(/\./g,'').replace(',','.'); else s=s.replace(/,/g,'');
  }else if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');
  const n=Number(s);return Number.isFinite(n)?n:null;
}
function moneyMentions(text){
  const re=/(?:€\s*)?(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|\d+(?:[.,]\d{2}))(?:\s*€)/g;
  const out=[];let m;
  while((m=re.exec(text))&&out.length<500){const n=parseEuroNumber(m[0]);if(n!==null)out.push({amountEUR:n,index:m.index,raw:m[0],context:text.slice(Math.max(0,m.index-140),Math.min(text.length,m.index+m[0].length+220))});}
  return out;
}
function interval(a,b){if(a===null||b===null)return null;return {minEUR:Math.min(a,b),maxEUR:Math.max(a,b)};}
function inInterval(v,intv,epsilon=0.02){return intv&&v>=intv.minEUR-epsilon&&v<=intv.maxEUR+epsilon;}
function staticOrRenderedLiteral(raw,needle){return String(raw||'').toLowerCase().includes(String(needle).toLowerCase());}

const chrome=findChrome();
const browser={available:Boolean(chrome),binary:chrome,version:null};
if(chrome){const v=spawnSync(chrome,['--version'],{encoding:'utf8',timeout:5000});browser.version=(v.stdout||v.stderr||'').trim()||null;}
const results=[];

for(const slug of TARGETS){
  const url=`${ORIGIN}/juegos/slots-online/${slug}`;
  const staticPage=await request(url,{headers:{accept:'text/html,*/*','cache-control':'no-cache, no-store, max-age=0','user-agent':UA}});
  const before=await gqlFeed();
  const poolBefore=distinct(before.rows,TARGET_ID);
  let render={attempted:false,success:false,status:null,stderr:null,dom:'',durationMs:null};
  if(chrome){
    const profile=fs.mkdtempSync(path.join(os.tmpdir(),`edge-pool1-${slug.slice(0,16)}-`));
    const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--incognito','--no-first-run','--no-default-browser-check','--disable-sync','--disable-component-update','--disable-popup-blocking','--window-size=1280,1600','--virtual-time-budget=9000',`--user-data-dir=${profile}`,'--dump-dom',url];
    const t0=Date.now();
    const p=spawnSync(chrome,args,{encoding:'utf8',timeout:22000,maxBuffer:16*1024*1024});
    render={attempted:true,success:p.status===0&&Boolean((p.stdout||'').trim()),status:p.status,stderr:String(p.stderr||'').slice(0,2000),dom:String(p.stdout||''),durationMs:Date.now()-t0};
    try{fs.rmSync(profile,{recursive:true,force:true});}catch{}
  }
  const after=await gqlFeed();
  const poolAfter=distinct(after.rows,TARGET_ID);
  const beforeUnique=poolBefore.length===1,afterUnique=poolAfter.length===1;
  const poolInterval=(beforeUnique&&afterUnique)?interval(poolBefore[0],poolAfter[0]):null;
  const staticText=visibleText(staticPage.text),renderedText=visibleText(render.dom);
  const staticMoney=moneyMentions(staticText),renderedMoney=moneyMentions(renderedText);
  const staticPoolIntervalMentions=staticMoney.filter(x=>inInterval(x.amountEUR,poolInterval));
  const renderedPoolIntervalMentions=renderedMoney.filter(x=>inInterval(x.amountEUR,poolInterval));
  const clientOnlyPoolIntervalMentions=renderedPoolIntervalMentions.filter(r=>!staticPoolIntervalMentions.some(s=>Math.abs(s.amountEUR-r.amountEUR)<0.005&&s.raw===r.raw));
  const exactPoolLiteralStatic=staticOrRenderedLiteral(staticPage.text,TARGET_ID);
  const exactPoolLiteralRendered=staticOrRenderedLiteral(render.dom,TARGET_ID);
  const clientOnlyPoolLiteral=exactPoolLiteralRendered&&!exactPoolLiteralStatic;
  const stableBefore=canonicalSingleAmounts(before.rows),stableAfter=canonicalSingleAmounts(after.rows);
  const competingSpecificIds=[];
  if(poolInterval){
    const ids=[...new Set([...stableBefore.map(x=>x.id),...stableAfter.map(x=>x.id)])];
    for(const id of ids){if(id===TARGET_ID||AMBIGUOUS_IDS.has(id))continue;const a=distinct(before.rows,id),b=distinct(after.rows,id);if(a.length!==1||b.length!==1)continue;const x=interval(a[0],b[0]);if(x&&!(x.maxEUR<poolInterval.minEUR-0.02||x.minEUR>poolInterval.maxEUR+0.02))competingSpecificIds.push({id,beforeEUR:a[0],afterEUR:b[0]});}
  }
  results.push({
    slug,url,
    static:{httpStatus:staticPage.status,sha256:staticPage.sha256,bytes:staticPage.text.length,pool1Literal:exactPoolLiteralStatic,poolIntervalMoneyMentions:staticPoolIntervalMentions.slice(0,12)},
    feed:{before:{observedAt:before.observedAt,httpStatus:before.httpStatus,pool1DistinctAmountsEUR:poolBefore},after:{observedAt:after.observedAt,httpStatus:after.httpStatus,pool1DistinctAmountsEUR:poolAfter},poolInterval,competingSpecificIds},
    rendered:{attempted:render.attempted,success:render.success,status:render.status,durationMs:render.durationMs,stderr:render.stderr,domSha256:render.success?sha(render.dom):null,domBytes:render.dom.length,visibleTextBytes:renderedText.length,pool1Literal:exactPoolLiteralRendered,clientOnlyPool1Literal,renderedPoolIntervalMoneyMentions:renderedPoolIntervalMentions.slice(0,20),clientOnlyPoolIntervalMoneyMentions:clientOnlyPoolIntervalMentions.slice(0,20)},
    discovery:{clientOnlyPool1Literal,clientOnlyIntervalAmountSeen:clientOnlyPoolIntervalMentions.length>0,noCompetingSpecificIdInInterval:competingSpecificIds.length===0,poolBranchRenderedDiscovery:render.success&&(clientOnlyPoolLiteral||(clientOnlyPoolIntervalMentions.length>0&&competingSpecificIds.length===0))}
  });
}

const successfulRenders=results.filter(x=>x.rendered.success).length;
const literalPages=results.filter(x=>x.discovery.clientOnlyPool1Literal).map(x=>x.slug);
const amountPages=results.filter(x=>x.discovery.clientOnlyIntervalAmountSeen&&x.discovery.noCompetingSpecificIdInInterval).map(x=>x.slug);
const discoveryPages=[...new Set([...literalPages,...amountPages])];
const globalAcrossAllSuccessful=successfulRenders>0&&discoveryPages.length===successfulRenders;
const pageSpecificDiscovery=globalAcrossAllSuccessful?[]:discoveryPages;
const complete=browser.available&&successfulRenders===TARGETS.length;
const renderedLayerExhausted=complete&&discoveryPages.length===0;
const out={
  version:'botemania-pool1-headless-rendered-dom-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',target:{network:'generic',id:TARGET_ID},browser,coverage:{targetCount:TARGETS.length,successfulRenders,complete},results,
  summary:{clientOnlyPool1LiteralPages:literalPages,clientOnlyPoolIntervalAmountPages:amountPages,discoveryPages,globalAcrossAllSuccessful,pageSpecificDiscovery,renderedLayerExhausted},
  decision:{exactGameIdentityRecovered:false,gameContainsPool1MeterVerified:false,renderedDiscoveryFound:discoveryPages.length>0,renderedLayerExhausted,nextStep:pageSpecificDiscovery.length?'REPLICATE_ONLY_DISCOVERY_PAGES_WITH_CDP_NETWORK_CAPTURE':renderedLayerExhausted?'BOUNDED_CDP_NETWORK_CAPTURE_ON_SAME_10_PUBLIC_PAGES':'INCOMPLETE_BROWSER_COVERAGE_RETRY_WITHOUT_SCIENTIFIC_NEGATIVE',economicPromotionAllowed:false,realMoneyAllowed:false},
  guards:{publicPagesOnly:true,ephemeralIncognitoProfiles:true,noPreexistingAuth:true,noLogin:true,noClick:true,noGameLaunch:true,noSessionCreationByAutomation:true,noBetting:true,noRankBasedIdentity:true,ambiguousIdsExcludedAsCompetitors:true,clientOnlyRenderedEvidenceRequired:true,sameCentIntervalMatchDiscoveryOnly:true,globalWidgetNeverGameIdentity:true,singleRenderNeverVerifiesGameIdentity:true,nullNeverCoercedToZero:true,economicPromotionAllowed:false,realMoneyAllowed:false}
};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({browser,coverage:out.coverage,summary:out.summary,rows:results.map(x=>({slug:x.slug,feed:x.feed,rendered:{success:x.rendered.success,durationMs:x.rendered.durationMs,clientOnlyPool1Literal:x.rendered.clientOnlyPool1Literal,clientOnlyPoolIntervalMoneyMentions:x.rendered.clientOnlyPoolIntervalMoneyMentions},discovery:x.discovery})),decision:out.decision},null,2));
