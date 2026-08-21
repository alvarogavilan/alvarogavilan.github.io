#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ORIGIN='https://www.botemania.es';
const GRAPHQL=`${ORIGIN}/es/graphql`;
const OUT='loterias-ai/casino/jackpots/evidence/tiki-zero-reset-visible-amount-binding-v1.json';
const TARGET_IDS=['tikitemple2_1','progressivealice1'];
const TARGETS=[
  {slug:'la-isla-de-tiki-tropico-dorado',role:'PRIMARY_TARGET'},
  {slug:'la-isla-de-tiki-bote',role:'OFFICIAL_SHARED_NETWORK'},
  {slug:'paper-wins-jackpot',role:'OFFICIAL_SHARED_NETWORK'},
  {slug:'boteman',role:'OFFICIAL_SHARED_NETWORK'},
  {slug:'winstones-bote',role:'OFFICIAL_SHARED_NETWORK'}
];
const CONTROLS=[
  {slug:'winfall-wishes-jackpot',role:'ZERO_RESET_CONTROL'},
  {slug:'bote-de-secretos-del-fenix',role:'ZERO_RESET_CONTROL'},
  {slug:'burbujas-saltarinas',role:'OTHER_PROGRESSIVE_CONTROL'}
];
const ALL=[...TARGETS,...CONTROLS];
const UA='loterias-ai-tiki-visible-amount-binding/1.0';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const finite=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const cents=v=>Number.isFinite(Number(v))?Math.round(Number(v)*100):null;

function findChrome(){
  for(const c of [process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean)){
    try{if(fs.existsSync(c))return c;}catch{}
  }
  for(const cmd of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){
    const w=spawnSync('which',[cmd],{encoding:'utf8'});if(w.status===0&&w.stdout.trim())return w.stdout.trim();
  }
  return null;
}

export function visibleTextFromHtml(html=''){
  return String(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&euro;|&#8364;/gi,'€')
    .replace(/\s+/g,' ')
    .trim();
}

export function extractEuroAmounts(text=''){
  const out=[];
  const re=/(?:€\s*)?(\d{1,6}(?:[.,]\d{1,2})?)(?:\s*€)/g;
  for(const m of String(text).matchAll(re)){
    const n=Number(String(m[1]).replace(',','.'));
    if(Number.isFinite(n)&&n>=0&&n<1_000_000)out.push(+n.toFixed(2));
  }
  return [...new Set(out)].sort((a,b)=>a-b);
}

export function amountMatchesWindow(amounts,beforeEUR,afterEUR,toleranceCents=3){
  if(!Array.isArray(amounts)||beforeEUR===null||afterEUR===null)return [];
  const lo=Math.min(cents(beforeEUR),cents(afterEUR))-toleranceCents;
  const hi=Math.max(cents(beforeEUR),cents(afterEUR))+toleranceCents;
  return amounts.filter(v=>{const c=cents(v);return c!==null&&c>=lo&&c<=hi;});
}

export function classifyVisibleBinding(rows=[]){
  const targetRows=rows.filter(r=>r.role==='PRIMARY_TARGET'||r.role==='OFFICIAL_SHARED_NETWORK');
  const controls=rows.filter(r=>!targetRows.includes(r));
  const targetHits=targetRows.filter(r=>(r.windowMatchesEUR||[]).length>0).map(r=>r.slug);
  const controlHits=controls.filter(r=>(r.windowMatchesEUR||[]).length>0).map(r=>r.slug);
  const exclusiveNetworkSignal=targetHits.length>0&&controlHits.length===0;
  const allSharedTargetsHit=targetRows.length>0&&targetHits.length===targetRows.length&&controlHits.length===0;
  return {targetHits,controlHits,exclusiveNetworkSignal,allSharedTargetsHit,identityVerified:false,requiresSecondFrozenReplication:exclusiveNetworkSignal};
}

async function publicFeed(){
  try{
    const r=await fetch(GRAPHQL,{method:'POST',headers:{accept:'application/json','content-type':'application/json',origin:ORIGIN,referer:ORIGIN+'/',venture:'botemania_es','cache-control':'no-cache, no-store, max-age=0','user-agent':UA},body:JSON.stringify({operationName:'loadJackpots',variables:{},query:'query loadJackpots { jackpots { id amount } }'}),signal:AbortSignal.timeout(9000)});
    const x=await r.json();
    const rows=(x?.data?.jackpots||[]).map(z=>({id:String(z?.id??'').trim(),amountEUR:finite(z?.amount)})).filter(z=>z.id&&z.amountEUR!==null);
    return {observedAt:new Date().toISOString(),httpStatus:r.status,rows};
  }catch(e){return {observedAt:new Date().toISOString(),httpStatus:null,rows:[],error:String(e?.name||e?.message||e)};}
}

function idState(feed,id){
  const rs=(feed?.rows||[]).filter(r=>r.id===id);
  const vals=[...new Set(rs.map(r=>r.amountEUR))];
  return {rowCount:rs.length,distinctAmountsEUR:vals,singleAmount:rs.length>0&&vals.length===1,amountEUR:vals.length===1?vals[0]:null};
}

function pairState(feed){
  const a=idState(feed,TARGET_IDS[0]),b=idState(feed,TARGET_IDS[1]);
  const same=a.singleAmount&&b.singleAmount&&cents(a.amountEUR)===cents(b.amountEUR);
  return {ids:{[TARGET_IDS[0]]:a,[TARGET_IDS[1]]:b},sameAmount:same,amountEUR:same?a.amountEUR:null};
}

function renderDom(chrome,slug){
  const url=`${ORIGIN}/juegos/slots-online/${slug}`;
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),`edge-tiki-vis-${slug.slice(0,12)}-`));
  try{
    const r=spawnSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--incognito','--no-first-run','--no-default-browser-check','--disable-sync','--disable-component-update',`--user-data-dir=${profile}`,'--virtual-time-budget=10000','--dump-dom',url],{encoding:'utf8',timeout:30000,maxBuffer:12*1024*1024});
    const html=String(r.stdout||'');
    const text=visibleTextFromHtml(html);
    return {url,success:r.status===0&&html.length>0,status:r.status,htmlBytes:html.length,textBytes:text.length,euroAmounts:extractEuroAmounts(text),error:r.error?String(r.error?.message||r.error):null,stderr:String(r.stderr||'').slice(0,600)};
  }finally{try{fs.rmSync(profile,{recursive:true,force:true});}catch{}}
}

async function probePage(chrome,item){
  const before=await publicFeed();
  const b=pairState(before);
  const render=renderDom(chrome,item.slug);
  const after=await publicFeed();
  const a=pairState(after);
  const usable=b.sameAmount&&a.sameAmount&&b.amountEUR!==null&&a.amountEUR!==null;
  const matches=usable?amountMatchesWindow(render.euroAmounts,b.amountEUR,a.amountEUR):[];
  return {slug:item.slug,role:item.role,url:render.url,success:render.success,feed:{before:{observedAt:before.observedAt,httpStatus:before.httpStatus,pair:b},after:{observedAt:after.observedAt,httpStatus:after.httpStatus,pair:a},usable},dom:{htmlBytes:render.htmlBytes,textBytes:render.textBytes,euroAmountCount:render.euroAmounts.length,euroAmounts:render.euroAmounts.slice(0,120),stderr:render.stderr,error:render.error},windowMatchesEUR:matches};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const chrome=findChrome();
  const browser={available:Boolean(chrome),binary:chrome,version:null};
  if(chrome){const v=spawnSync(chrome,['--version'],{encoding:'utf8',timeout:5000});browser.version=String(v.stdout||v.stderr||'').trim()||null;}
  const rows=[];
  if(chrome){for(const item of ALL){rows.push(await probePage(chrome,item));await sleep(150);}}
  const coverage={expectedPages:ALL.length,capturedPages:rows.filter(r=>r.success).length,allFeedsUsable:rows.length===ALL.length&&rows.every(r=>r.feed.usable),complete:Boolean(chrome)&&rows.length===ALL.length&&rows.every(r=>r.success)&&rows.every(r=>r.feed.usable)};
  const comparison=classifyVisibleBinding(rows);
  const out={version:'tiki-zero-reset-visible-amount-binding-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',hypothesis:{network:'TIKI_TROPICO_ZERO_RESET',targetIds:TARGET_IDS,officialNetworkPages:TARGETS.map(x=>x.slug),controls:CONTROLS.map(x=>x.slug),preregisteredRule:'VISIBLE_TEXT_AMOUNT_MUST_FALL_WITHIN_SAME_PAGE_BEFORE_AFTER_TARGET_PAIR_WINDOW_AND_NOT_REPRODUCE_IN_CONTROLS'},browser,coverage,rows,comparison,decision:{networkBindingCandidate:coverage.complete&&comparison.exclusiveNetworkSignal,exactGameBindingVerified:false,identityPromotionAllowed:false,economicPromotionAllowed:false,realMoneyAllowed:false,nextStep:coverage.complete?(comparison.exclusiveNetworkSignal?'FREEZE_RESULT_AND_RUN_SECOND_INDEPENDENT_REPLICATION_BEFORE_ANY_IDENTITY_PROMOTION':'VISIBLE_AMOUNT_LAYER_NEGATIVE_OR_NON_DISCRIMINATING; DO_NOT_REPEAT WITHOUT NEW EVIDENCE'):'INCOMPLETE_COVERAGE_RETRY_WITHOUT_NEGATIVE'},guards:{scriptsAndStylesExcludedFromVisibleText:true,livePairUniqueAndEqualBeforeAfterEachPage:true,controlsMandatory:true,singleRunNeverVerifiesIdentity:true,noAuthentication:true,noCookies:true,noClicks:true,noGameLaunch:true,noBetting:true,realMoneyAllowed:false}};
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
  console.log(JSON.stringify({browser,coverage,comparison,decision:out.decision,rows:rows.map(r=>({slug:r.slug,role:r.role,success:r.success,before:r.feed.before.pair.amountEUR,after:r.feed.after.pair.amountEUR,matches:r.windowMatchesEUR,euroAmountCount:r.dom.euroAmountCount}))},null,2));
}
