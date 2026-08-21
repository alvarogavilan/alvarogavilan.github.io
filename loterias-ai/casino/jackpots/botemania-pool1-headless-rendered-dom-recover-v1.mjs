#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';

const ORIGIN='https://www.botemania.es';
const GRAPHQL=`${ORIGIN}/es/graphql`;
const FILE='loterias-ai/casino/jackpots/evidence/botemania-pool1-headless-rendered-dom-v1.json';
const TARGET_ID='pool1';
const FEED_QUERY='query loadJackpots { jackpots { id amount } }';
const UA='loterias-ai-pool1-headless-rendered-dom-recover/1.0';
const AMBIGUOUS_IDS=new Set(['JACKPOT','JackpotPool','progressive_id1']);
const sha=s=>crypto.createHash('sha256').update(String(s||'')).digest('hex');
const finiteOrNull=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;};

async function request(url,opts={}){try{const r=await fetch(url,{...opts,redirect:'follow',signal:AbortSignal.timeout(12000)});const text=await r.text();return{status:r.status,ok:r.ok,text,error:null};}catch(e){return{status:null,ok:false,text:'',error:String(e?.name||e?.message||e)}}}
async function feed(){const r=await request(GRAPHQL,{method:'POST',headers:{accept:'application/json','content-type':'application/json',venture:'botemania_es',origin:ORIGIN,referer:`${ORIGIN}/`,'cache-control':'no-cache, no-store, max-age=0','user-agent':UA},body:JSON.stringify({operationName:'loadJackpots',variables:{},query:FEED_QUERY})});let b=null;try{b=JSON.parse(r.text)}catch{}const rows=(b?.data?.jackpots||[]).map(x=>({id:String(x?.id??'').trim(),amountEUR:finiteOrNull(x?.amount)})).filter(x=>x.id&&x.amountEUR!==null);return{observedAt:new Date().toISOString(),httpStatus:r.status,rows};}
const distinct=(rows,id)=>[...new Set(rows.filter(x=>x.id===id).map(x=>x.amountEUR))];
function visibleText(html){return String(html||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&euro;|&#8364;/gi,'€').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();}
function parseEuro(raw){let s=String(raw||'').replace(/\s/g,'').replace(/€/g,'');if(!s)return null;if(s.includes(',')&&s.includes('.')){if(s.lastIndexOf(',')>s.lastIndexOf('.'))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(/,/g,'');}else if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:null;}
function moneyMentions(text){const re=/(?:€\s*)?(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})|\d+(?:[.,]\d{2}))(?:\s*€)/g,out=[];let m;while((m=re.exec(text))&&out.length<500){const n=parseEuro(m[0]);if(n!==null)out.push({amountEUR:n,index:m.index,raw:m[0],context:text.slice(Math.max(0,m.index-140),Math.min(text.length,m.index+m[0].length+220))});}return out;}
const interval=(a,b)=>({minEUR:Math.min(a,b),maxEUR:Math.max(a,b)});
const inInterval=(v,x)=>x&&v>=x.minEUR-0.02&&v<=x.maxEUR+0.02;
function canonical(rows){const by=new Map();for(const r of rows){if(!by.has(r.id))by.set(r.id,new Set());by.get(r.id).add(r.amountEUR);}return[...by.entries()].filter(([,s])=>s.size===1).map(([id,s])=>({id,amountEUR:[...s][0]}));}
function chromeBin(){for(const c of ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'])if(fs.existsSync(c))return c;return null;}

if(!fs.existsSync(FILE))throw new Error('primary headless evidence file missing');
const x=JSON.parse(fs.readFileSync(FILE,'utf8'));
const failed=(x.results||[]).filter(r=>r?.rendered?.success!==true);
const chrome=chromeBin();
const recovery=[];
for(const r of failed){
  const staticPage=await request(r.url,{headers:{accept:'text/html,*/*','cache-control':'no-cache, no-store, max-age=0','user-agent':UA}});
  const before=await feed(),pb=distinct(before.rows,TARGET_ID);
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),`edge-pool1-retry-${r.slug.slice(0,16)}-`));
  const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--incognito','--no-first-run','--no-default-browser-check','--disable-sync','--disable-component-update','--disable-popup-blocking','--window-size=1280,1600','--virtual-time-budget=12000',`--user-data-dir=${profile}`,'--dump-dom',r.url];
  const t0=Date.now();
  const p=chrome?spawnSync(chrome,args,{encoding:'utf8',timeout:45000,maxBuffer:16*1024*1024}):{status:null,stdout:'',stderr:'chrome unavailable'};
  const dom=String(p.stdout||''),success=p.status===0&&Boolean(dom.trim());
  try{fs.rmSync(profile,{recursive:true,force:true});}catch{}
  const after=await feed(),pa=distinct(after.rows,TARGET_ID);
  const band=pb.length===1&&pa.length===1?interval(pb[0],pa[0]):null;
  const staticText=visibleText(staticPage.text),renderedText=visibleText(dom);
  const sm=moneyMentions(staticText).filter(v=>inInterval(v.amountEUR,band));
  const rm=moneyMentions(renderedText).filter(v=>inInterval(v.amountEUR,band));
  const clientOnly=rm.filter(v=>!sm.some(s=>Math.abs(s.amountEUR-v.amountEUR)<0.005&&s.raw===v.raw));
  const staticLiteral=String(staticPage.text||'').toLowerCase().includes(TARGET_ID);
  const renderedLiteral=dom.toLowerCase().includes(TARGET_ID);
  const clientOnlyLiteral=renderedLiteral&&!staticLiteral;
  const ids=[...new Set([...canonical(before.rows).map(z=>z.id),...canonical(after.rows).map(z=>z.id)])];
  const competing=[];
  if(band){for(const id of ids){if(id===TARGET_ID||AMBIGUOUS_IDS.has(id))continue;const a=distinct(before.rows,id),b=distinct(after.rows,id);if(a.length!==1||b.length!==1)continue;const ib=interval(a[0],b[0]);if(!(ib.maxEUR<band.minEUR-0.02||ib.minEUR>band.maxEUR+0.02))competing.push({id,beforeEUR:a[0],afterEUR:b[0]});}}
  if(success){
    r.static={httpStatus:staticPage.status,sha256:sha(staticPage.text),bytes:staticPage.text.length,pool1Literal:staticLiteral,poolIntervalMoneyMentions:sm.slice(0,12)};
    r.feed={before:{observedAt:before.observedAt,httpStatus:before.httpStatus,pool1DistinctAmountsEUR:pb},after:{observedAt:after.observedAt,httpStatus:after.httpStatus,pool1DistinctAmountsEUR:pa},poolInterval:band,competingSpecificIds:competing};
    r.rendered={attempted:true,success:true,status:p.status,durationMs:Date.now()-t0,stderr:String(p.stderr||'').slice(0,2000),domSha256:sha(dom),domBytes:dom.length,visibleTextBytes:renderedText.length,pool1Literal:renderedLiteral,clientOnlyPool1Literal:clientOnlyLiteral,renderedPoolIntervalMoneyMentions:rm.slice(0,20),clientOnlyPoolIntervalMoneyMentions:clientOnly.slice(0,20),recoveredByRetry:true};
    r.discovery={clientOnlyPool1Literal:clientOnlyLiteral,clientOnlyIntervalAmountSeen:clientOnly.length>0,noCompetingSpecificIdInInterval:competing.length===0,poolBranchRenderedDiscovery:clientOnlyLiteral||(clientOnly.length>0&&competing.length===0)};
  }
  recovery.push({slug:r.slug,success,status:p.status,durationMs:Date.now()-t0,pool1BeforeEUR:pb.length===1?pb[0]:null,pool1AfterEUR:pa.length===1?pa[0]:null,clientOnlyPool1Literal:clientOnlyLiteral,clientOnlyIntervalAmountCount:clientOnly.length,competingSpecificIdCount:competing.length});
}
const results=x.results||[];
const successful=results.filter(r=>r?.rendered?.success===true).length;
const literalPages=results.filter(r=>r?.discovery?.clientOnlyPool1Literal===true).map(r=>r.slug);
const amountPages=results.filter(r=>r?.discovery?.clientOnlyIntervalAmountSeen===true&&r?.discovery?.noCompetingSpecificIdInInterval===true).map(r=>r.slug);
const discovery=[...new Set([...literalPages,...amountPages])];
const complete=Boolean(chrome)&&successful===results.length&&results.length===10;
const global=complete&&discovery.length===successful;
const pageSpecific=global?[]:discovery;
x.recovery={attemptedAt:new Date().toISOString(),failedBeforeRecovery:failed.length,retries:recovery};
x.coverage={targetCount:10,successfulRenders:successful,complete};
x.summary={clientOnlyPool1LiteralPages:literalPages,clientOnlyPoolIntervalAmountPages:amountPages,discoveryPages:discovery,globalAcrossAllSuccessful:global,pageSpecificDiscovery:pageSpecific,renderedLayerExhausted:complete&&discovery.length===0};
x.decision={exactGameIdentityRecovered:false,gameContainsPool1MeterVerified:false,renderedDiscoveryFound:discovery.length>0,renderedLayerExhausted:x.summary.renderedLayerExhausted,nextStep:pageSpecific.length?'REPLICATE_ONLY_DISCOVERY_PAGES_WITH_CDP_NETWORK_CAPTURE':x.summary.renderedLayerExhausted?'BOUNDED_CDP_NETWORK_CAPTURE_ON_SAME_10_PUBLIC_PAGES':'INCOMPLETE_BROWSER_COVERAGE_RETRY_WITHOUT_SCIENTIFIC_NEGATIVE',economicPromotionAllowed:false,realMoneyAllowed:false};
x.guards.retryOnlyFailedPages=true;
fs.writeFileSync(FILE,JSON.stringify(x,null,2)+'\n');
console.log(JSON.stringify({recovery:x.recovery,coverage:x.coverage,summary:x.summary,decision:x.decision},null,2));
