#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';

const ORIGIN='https://www.botemania.es';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-pool1-passive-cdp-network-v1.json';
const TARGET_ID='pool1';
const TARGETS=['winfall-wishes-jackpot','wonderland','la-isla-de-tiki','boteman','paper-wins-jackpot','la-isla-de-tiki-bote','winstones-bote','la-isla-de-tiki-tropico-dorado','bote-de-secretos-del-fenix','duble-buble-bote-triple'];
const SECRET_KEY_RE=/(token|session|auth|secret|password|signature|sig|jwt|cookie)/i;
const INTERESTING_URL_RE=/(graphql|jackpot|game|config|launch|resource|roxor|progressive)/i;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const sha=s=>crypto.createHash('sha256').update(String(s||'')).digest('hex');

function findChrome(){for(const c of ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'])if(fs.existsSync(c))return c;for(const cmd of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const w=spawnSync('which',[cmd],{encoding:'utf8'});if(w.status===0&&w.stdout.trim())return w.stdout.trim();}return null;}
function redactValue(v,key=''){
  if(SECRET_KEY_RE.test(key))return '[REDACTED]';
  if(Array.isArray(v))return v.map((x,i)=>redactValue(x,String(i)));
  if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,redactValue(x,k)]));
  return v;
}
function safeUrl(raw){try{const u=new URL(raw);u.hash='';for(const [k] of u.searchParams)if(SECRET_KEY_RE.test(k))u.searchParams.set(k,'[REDACTED]');return u.href;}catch{return String(raw||'');}}
function parseGraphqlPost(postData){if(!postData)return null;try{const x=JSON.parse(postData);const one=Array.isArray(x)?x[0]:x;return{operationName:one?.operationName||null,variables:redactValue(one?.variables||{}),querySha256:one?.query?sha(one.query):null,queryName:(String(one?.query||'').match(/\b(?:query|mutation)\s+([A-Za-z0-9_]+)/)||[])[1]||null};}catch{return null;}}
function findJsonPaths(value,needle,pathNow='$',out=[]){if(out.length>=30)return out;if(typeof value==='string'&&value===needle)out.push(pathNow);else if(Array.isArray(value))value.forEach((v,i)=>findJsonPaths(v,needle,`${pathNow}[${i}]`,out));else if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))findJsonPaths(v,needle,`${pathNow}.${k}`,out);return out;}
function contextHits(text,needle,limit=4){const raw=String(text||''),low=raw.toLowerCase(),n=needle.toLowerCase(),out=[];let p=0;while(out.length<limit){const i=low.indexOf(n,p);if(i<0)break;out.push(raw.slice(Math.max(0,i-160),Math.min(raw.length,i+n.length+260)));p=i+n.length;}return out;}
function requestSignature(r){let pathname='';try{pathname=new URL(r.url).pathname}catch{}return`${r.method}|${pathname}|${r.graphql?.operationName||r.graphql?.queryName||''}`;}
function selectorSignature(r){const base=requestSignature(r);const vars=r.graphql?.variables;if(vars&&typeof vars==='object'&&Object.keys(vars).length)return`${base}|vars:${sha(JSON.stringify(vars))}`;return base;}
function normalized(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'');}
function deepContainsTarget(value,slug){const want=normalized(slug);if(!want)return false;if(typeof value==='string')return normalized(value).includes(want);if(Array.isArray(value))return value.some(v=>deepContainsTarget(v,slug));if(value&&typeof value==='object')return Object.entries(value).some(([k,v])=>deepContainsTarget(k,slug)||deepContainsTarget(v,slug));return false;}

class CDP{
  constructor(url){this.url=url;this.id=0;this.pending=new Map();this.handlers=new Map();this.ws=null;}
  async open(){return new Promise((resolve,reject)=>{const ws=new WebSocket(this.url);this.ws=ws;const t=setTimeout(()=>reject(new Error('CDP websocket open timeout')),8000);ws.addEventListener('open',()=>{clearTimeout(t);resolve();});ws.addEventListener('error',e=>{clearTimeout(t);reject(e.error||new Error('CDP websocket error'));});ws.addEventListener('message',e=>{let m;try{m=JSON.parse(e.data)}catch{return;}if(m.id&&this.pending.has(m.id)){const p=this.pending.get(m.id);this.pending.delete(m.id);if(m.error)p.reject(new Error(m.error.message||'CDP error'));else p.resolve(m.result);}else if(m.method){for(const h of(this.handlers.get(m.method)||[]))try{h(m.params||{})}catch{}}});});}
  on(method,fn){if(!this.handlers.has(method))this.handlers.set(method,[]);this.handlers.get(method).push(fn);}
  send(method,params={}){const id=++this.id;return new Promise((resolve,reject)=>{const t=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP ${method} timeout`));},7000);this.pending.set(id,{resolve:r=>{clearTimeout(t);resolve(r);},reject:e=>{clearTimeout(t);reject(e);}});this.ws.send(JSON.stringify({id,method,params}));});}
  close(){try{this.ws?.close();}catch{}}
}
async function waitDevtoolsFile(file,timeoutMs=10000){const end=Date.now()+timeoutMs;while(Date.now()<end){if(fs.existsSync(file)){const lines=fs.readFileSync(file,'utf8').trim().split(/\r?\n/);if(lines[0])return Number(lines[0]);}await sleep(100);}throw new Error('DevToolsActivePort not created');}
async function capturePage(chrome,slug){
  const url=`${ORIGIN}/juegos/slots-online/${slug}`;
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),`edge-cdp-${slug.slice(0,14)}-`));
  const portFile=path.join(profile,'DevToolsActivePort');
  const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--incognito','--no-first-run','--no-default-browser-check','--disable-sync','--disable-component-update','--disable-popup-blocking','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'];
  const proc=spawn(chrome,args,{stdio:['ignore','ignore','pipe']});let stderr='';proc.stderr.on('data',d=>{if(stderr.length<4000)stderr+=String(d);});
  let cdp=null;
  try{
    const port=await waitDevtoolsFile(portFile);
    const targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());
    const page=targets.find(x=>x.type==='page'&&x.webSocketDebuggerUrl)||targets.find(x=>x.webSocketDebuggerUrl);
    if(!page)throw new Error('no CDP page target');
    cdp=new CDP(page.webSocketDebuggerUrl);await cdp.open();
    const requests=new Map(),responses=new Map();let loadFired=false;
    cdp.on('Network.requestWillBeSent',p=>{const q=p.request||{};requests.set(p.requestId,{requestId:p.requestId,url:safeUrl(q.url),method:q.method||null,type:p.type||null,documentURL:safeUrl(p.documentURL||''),graphql:parseGraphqlPost(q.postData),postDataPresent:Boolean(q.postData),initiatorType:p.initiator?.type||null});});
    cdp.on('Network.responseReceived',p=>{const q=p.response||{};responses.set(p.requestId,{requestId:p.requestId,url:safeUrl(q.url),status:q.status,mimeType:q.mimeType||null,type:p.type||null,fromDiskCache:Boolean(q.fromDiskCache),fromServiceWorker:Boolean(q.fromServiceWorker)});});
    cdp.on('Page.loadEventFired',()=>{loadFired=true;});
    await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Page.enable');
    const nav=await cdp.send('Page.navigate',{url});
    const deadline=Date.now()+14000;while(Date.now()<deadline&&!loadFired)await sleep(150);await sleep(3500);
    const relevant=[];
    for(const [requestId,res] of responses){
      const req=requests.get(requestId)||{requestId,url:res.url,method:null,graphql:null};
      const isGraphql=/\/graphql(?:\?|$)/i.test(req.url||'');
      const isInteresting=isGraphql||INTERESTING_URL_RE.test(req.url||'');
      if(!isInteresting)continue;
      let bodyMeta={available:false,bytes:null,sha256:null,containsPool1:false,containsSlug:false,pool1JsonPaths:[],pool1Contexts:[]};
      try{
        const bodyRes=await cdp.send('Network.getResponseBody',{requestId});
        const body=bodyRes?.body||'';
        if(body.length<=3_000_000){
          let paths=[];try{paths=findJsonPaths(JSON.parse(body),TARGET_ID)}catch{}
          bodyMeta={available:true,bytes:body.length,sha256:sha(body),containsPool1:body.includes(TARGET_ID),containsSlug:normalized(body).includes(normalized(slug)),pool1JsonPaths:paths,pool1Contexts:body.includes(TARGET_ID)?contextHits(body,TARGET_ID,4):[]};
        }else bodyMeta={available:true,bytes:body.length,sha256:sha(body),containsPool1:false,containsSlug:false,pool1JsonPaths:[],pool1Contexts:[],bodyTooLargeForInspection:true};
      }catch(e){bodyMeta.error=String(e?.message||e);}
      relevant.push({...req,response:{...res,body:bodyMeta},signature:requestSignature(req),selectorSignature:selectorSignature(req),requestUrlContainsSlug:normalized(req.url).includes(normalized(slug)),graphqlVariablesContainSlug:deepContainsTarget(req.graphql?.variables,slug)});
    }
    const poolResponses=relevant.filter(x=>x.response?.body?.containsPool1===true);
    return{slug,url,success:true,loadEventFired:loadFired,navigationErrorText:nav?.errorText||null,relevantRequestCount:relevant.length,relevant,poolResponses,stderr:stderr.slice(0,1200)};
  }catch(e){return{slug,url,success:false,error:String(e?.message||e),stderr:stderr.slice(0,2000),relevant:[],poolResponses:[]};}
  finally{try{cdp?.close();}catch{}try{proc.kill('SIGKILL');}catch{}await sleep(100);try{fs.rmSync(profile,{recursive:true,force:true});}catch{}}
}

const chrome=findChrome();
const browser={available:Boolean(chrome),binary:chrome,version:null};if(chrome){const v=spawnSync(chrome,['--version'],{encoding:'utf8',timeout:5000});browser.version=(v.stdout||v.stderr||'').trim()||null;}
const pages=[];if(chrome)for(const slug of TARGETS)pages.push(await capturePage(chrome,slug));
const successful=pages.filter(x=>x.success).length;
const routeSignaturePages=new Map(),selectorSignaturePages=new Map();
for(const p of pages){
  for(const sig of new Set((p.relevant||[]).map(x=>x.signature))){if(!routeSignaturePages.has(sig))routeSignaturePages.set(sig,new Set());routeSignaturePages.get(sig).add(p.slug);}
  for(const sig of new Set((p.relevant||[]).map(x=>x.selectorSignature))){if(!selectorSignaturePages.has(sig))selectorSignaturePages.set(sig,new Set());selectorSignaturePages.get(sig).add(p.slug);}
}
const classifiedPoolResponses=[];
for(const p of pages){
  for(const r of p.poolResponses||[]){
    const routePageCount=routeSignaturePages.get(r.signature)?.size||0;
    const selectorPageCount=selectorSignaturePages.get(r.selectorSignature)?.size||0;
    const operation=r.graphql?.operationName||r.graphql?.queryName||null;
    const routeGlobal=routePageCount===TARGETS.length;
    const selectorGlobal=selectorPageCount===TARGETS.length;
    const responseContainsSlug=r.response.body.containsSlug===true;
    const explicitTargetBinding=responseContainsSlug||r.requestUrlContainsSlug===true||r.graphqlVariablesContainSlug===true;
    const differentialSelector=!selectorGlobal;
    const nonGlobalPoolDiscovery=operation!=='loadJackpots'&&(explicitTargetBinding||differentialSelector);
    const candidateClass=nonGlobalPoolDiscovery?(explicitTargetBinding?'EXPLICIT_TARGET_BOUND':'DIFFERENTIAL_SELECTOR_ONLY'):null;
    classifiedPoolResponses.push({slug:p.slug,signature:r.signature,selectorSignature:r.selectorSignature,routeSignaturePageCount:routePageCount,selectorSignaturePageCount:selectorPageCount,routeGlobal,selectorGlobal,operation,url:r.url,requestVariables:r.graphql?.variables||null,bodyBytes:r.response.body.bytes,bodySha256:r.response.body.sha256,pool1JsonPaths:r.response.body.pool1JsonPaths,responseContainsSlug,requestUrlContainsSlug:r.requestUrlContainsSlug,graphqlVariablesContainSlug:r.graphqlVariablesContainSlug,explicitTargetBinding,differentialSelector,pageSpecificPoolDiscovery:nonGlobalPoolDiscovery,candidateClass});
  }
}
const pageSpecificCandidates=classifiedPoolResponses.filter(x=>x.pageSpecificPoolDiscovery);
const explicitTargetCandidates=pageSpecificCandidates.filter(x=>x.candidateClass==='EXPLICIT_TARGET_BOUND');
const differentialSelectorCandidates=pageSpecificCandidates.filter(x=>x.candidateClass==='DIFFERENTIAL_SELECTOR_ONLY');
const globalLoadJackpots=classifiedPoolResponses.filter(x=>x.operation==='loadJackpots');
const commonSignatures=[...routeSignaturePages.entries()].filter(([,s])=>s.size===TARGETS.length).map(([signature])=>signature);
const commonSelectorSignatures=[...selectorSignaturePages.entries()].filter(([,s])=>s.size===TARGETS.length).map(([signature])=>signature);
const complete=Boolean(chrome)&&successful===TARGETS.length;
const noPageSpecificPoolSignal=pageSpecificCandidates.length===0;
const out={version:'botemania-pool1-passive-cdp-network-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',target:{network:'generic',id:TARGET_ID},browser,coverage:{targetCount:TARGETS.length,successfulCaptures:successful,complete},pages,comparison:{commonSignatures,commonSelectorSignatures,classifiedPoolResponses,globalLoadJackpotsCount:globalLoadJackpots.length,pageSpecificCandidates,explicitTargetCandidates,differentialSelectorCandidates,noPageSpecificPoolSignal},decision:{exactGameIdentityRecovered:false,passiveNetworkGameMappingVerified:false,pageSpecificPoolDiscoveryFound:pageSpecificCandidates.length>0,networkLayerExhausted:complete&&noPageSpecificPoolSignal,nextStep:pageSpecificCandidates.length?'REPLICATE_ONLY_PAGE_SPECIFIC_POOL_RESPONSES_AND_INSPECT_EXACT_READ_ONLY_OPERATION_SEMANTICS':complete?'PUBLIC_PAGE_LOAD_NETWORK_LAYER_EXHAUSTED; MOVE_TO_PROVIDER_PUBLIC_RULE_OR_HELP_ASSET_MAPPING':'INCOMPLETE_CDP_COVERAGE_RETRY_WITHOUT_SCIENTIFIC_NEGATIVE',economicPromotionAllowed:false,realMoneyAllowed:false},guards:{publicPageLoadOnly:true,ephemeralFreshProfiles:true,noPreexistingAuth:true,noLogin:true,noClick:true,noRuntimeEvaluate:true,noRequestInterception:true,noMutation:true,noGameLaunch:true,noBetting:true,noPersistentCookies:true,noHeadersPersisted:true,secretLikeUrlAndVariableValuesRedacted:true,responseBodiesNotPersisted:true,globalLoadJackpotsNeverMapsGameIdentity:true,separateResponsesNeverCombinedIntoIdentityProof:true,singleCaptureNeverVerifiesIdentity:true,graphqlVariableBindingConsidered:true,selectorDifferentialPreventsPrematureExhaustion:true,incompleteCoverageNeverExhaustsLayer:true,nullNeverCoercedToZero:true,economicPromotionAllowed:false,realMoneyAllowed:false}};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({browser,coverage:out.coverage,comparison:{commonSignatureCount:commonSignatures.length,commonSelectorSignatureCount:commonSelectorSignatures.length,classifiedPoolResponses,globalLoadJackpotsCount:globalLoadJackpots.length,pageSpecificCandidates,explicitTargetCandidates,differentialSelectorCandidates},decision:out.decision,pages:pages.map(p=>({slug:p.slug,success:p.success,loadEventFired:p.loadEventFired,relevantRequestCount:p.relevantRequestCount,poolResponseCount:p.poolResponses?.length||0,error:p.error||null}))},null,2));
