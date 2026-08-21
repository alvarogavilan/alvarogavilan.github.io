#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';

const OUT='loterias-ai/casino/jackpots/evidence/bouncy-bubbles-passive-identity-v1.json';
const TARGET_ID='bouncy_bubbles_id';
const TARGET_SLUG='burbujas-saltarinas';
const TARGET_TITLE='Burbujas Saltarinas';
const CONTROL_SLUGS=['la-isla-de-tiki','paper-wins-jackpot'];
const OPERATORS={
  botemania:{origin:'https://www.botemania.es',venture:'botemania_es'},
  monopoly:{origin:'https://www.monopolycasino.es',venture:'monopolycasino_es'}
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const sha=s=>crypto.createHash('sha256').update(String(s||'')).digest('hex');
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'').trim();
const SECRET_RE=/(token|session|auth|secret|password|signature|sig|jwt|cookie)/i;

function findChrome(){for(const c of ['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'])if(fs.existsSync(c))return c;for(const cmd of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const w=spawnSync('which',[cmd],{encoding:'utf8'});if(w.status===0&&w.stdout.trim())return w.stdout.trim();}return null;}
function redactValue(v,key=''){if(SECRET_RE.test(key))return '[REDACTED]';if(Array.isArray(v))return v.map((x,i)=>redactValue(x,String(i)));if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,redactValue(x,k)]));return v;}
function safeUrl(raw){try{const u=new URL(raw);u.hash='';for(const [k] of u.searchParams)if(SECRET_RE.test(k))u.searchParams.set(k,'[REDACTED]');return u.href;}catch{return String(raw||'');}}
function parseGraphqlPost(postData){if(!postData)return null;try{const x=JSON.parse(postData),one=Array.isArray(x)?x[0]:x;return{operationName:one?.operationName||null,queryName:(String(one?.query||'').match(/\b(?:query|mutation)\s+([A-Za-z0-9_]+)/)||[])[1]||null,variables:redactValue(one?.variables||{}),querySha256:one?.query?sha(one.query):null};}catch{return null;}}
function deepContains(value,needle){const n=norm(needle);if(!n)return false;if(typeof value==='string')return norm(value).includes(n);if(Array.isArray(value))return value.some(v=>deepContains(v,needle));if(value&&typeof value==='object')return Object.entries(value).some(([k,v])=>deepContains(k,needle)||deepContains(v,needle));return false;}
function objectBindings(value,pathNow='$',out=[]){if(out.length>=30)return out;if(value&&typeof value==='object'){
  const hasId=deepContains(value,TARGET_ID),hasGame=deepContains(value,TARGET_SLUG)||deepContains(value,TARGET_TITLE);
  const depth=(pathNow.match(/[.[]/g)||[]).length;
  if(hasId&&hasGame&&depth>=2)out.push(pathNow);
  if(Array.isArray(value))value.forEach((v,i)=>objectBindings(v,`${pathNow}[${i}]`,out));else for(const [k,v] of Object.entries(value))objectBindings(v,`${pathNow}.${k}`,out);
}return [...new Set(out)];}
function idPaths(value,pathNow='$',out=[]){if(out.length>=40)return out;if(typeof value==='string'&&value===TARGET_ID)out.push(pathNow);else if(Array.isArray(value))value.forEach((v,i)=>idPaths(v,`${pathNow}[${i}]`,out));else if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))idPaths(v,`${pathNow}.${k}`,out);return out;}
function contexts(text,needle,limit=4){const raw=String(text||''),low=raw.toLowerCase(),n=needle.toLowerCase(),out=[];let p=0;while(out.length<limit){const i=low.indexOf(n,p);if(i<0)break;out.push(raw.slice(Math.max(0,i-180),Math.min(raw.length,i+n.length+300)));p=i+n.length;}return out;}
function requestSignature(r){let pathname='';try{pathname=new URL(r.url).pathname}catch{}return`${r.method}|${pathname}|${r.graphql?.operationName||r.graphql?.queryName||''}`;}
function selectorSignature(r){const vars=r.graphql?.variables||{};return`${requestSignature(r)}|vars:${sha(JSON.stringify(vars))}`;}

async function publicFeed(op){
  const endpoint=`${op.origin}/es/graphql`;
  try{
    const r=await fetch(endpoint,{method:'POST',headers:{accept:'application/json','content-type':'application/json',origin:op.origin,referer:op.origin+'/',venture:op.venture,'cache-control':'no-cache, no-store, max-age=0','user-agent':'edge-bouncy-passive-identity/1.0'},body:JSON.stringify({operationName:'loadJackpots',variables:{},query:'query loadJackpots { jackpots { id amount } }'}),signal:AbortSignal.timeout(9000)});
    const x=await r.json();const rows=Array.isArray(x?.data?.jackpots)?x.data.jackpots:[];const vals=rows.filter(z=>String(z?.id??'')===TARGET_ID).map(z=>Number(z.amount)).filter(Number.isFinite);
    return{observedAt:new Date().toISOString(),httpStatus:r.status,rowCount:rows.length,targetAmountsEUR:[...new Set(vals)],targetUnique:vals.length===1};
  }catch(e){return{observedAt:new Date().toISOString(),httpStatus:null,rowCount:0,targetAmountsEUR:[],targetUnique:false,error:String(e?.name||e?.message||e)};}
}

class CDP{
  constructor(url){this.url=url;this.id=0;this.pending=new Map();this.handlers=new Map();this.ws=null;}
  async open(){return new Promise((resolve,reject)=>{const ws=new WebSocket(this.url);this.ws=ws;const t=setTimeout(()=>reject(new Error('CDP open timeout')),8000);ws.addEventListener('open',()=>{clearTimeout(t);resolve();});ws.addEventListener('error',()=>{clearTimeout(t);reject(new Error('CDP websocket error'));});ws.addEventListener('message',e=>{let m;try{m=JSON.parse(e.data)}catch{return;}if(m.id&&this.pending.has(m.id)){const p=this.pending.get(m.id);this.pending.delete(m.id);m.error?p.reject(new Error(m.error.message||'CDP error')):p.resolve(m.result);}else if(m.method)for(const h of(this.handlers.get(m.method)||[]))try{h(m.params||{})}catch{}});});}
  on(method,fn){if(!this.handlers.has(method))this.handlers.set(method,[]);this.handlers.get(method).push(fn);}
  send(method,params={}){const id=++this.id;return new Promise((resolve,reject)=>{const t=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP ${method} timeout`));},7000);this.pending.set(id,{resolve:r=>{clearTimeout(t);resolve(r);},reject:e=>{clearTimeout(t);reject(e);}});this.ws.send(JSON.stringify({id,method,params}));});}
  close(){try{this.ws?.close();}catch{}}
}
async function waitPort(file){const end=Date.now()+10000;while(Date.now()<end){if(fs.existsSync(file)){const n=Number(fs.readFileSync(file,'utf8').trim().split(/\r?\n/)[0]);if(Number.isFinite(n))return n;}await sleep(100);}throw new Error('DevToolsActivePort missing');}
async function capture(chrome,opName,op,slug,role){
  const url=`${op.origin}/juegos/slots-online/${slug}`;const profile=fs.mkdtempSync(path.join(os.tmpdir(),`edge-bouncy-${opName}-${role}-`));const proc=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--incognito','--no-first-run','--no-default-browser-check','--disable-sync','--disable-component-update','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});let cdp=null,stderr='';proc.stderr.on('data',d=>{if(stderr.length<1800)stderr+=String(d);});
  try{
    const port=await waitPort(path.join(profile,'DevToolsActivePort'));const targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());const page=targets.find(x=>x.type==='page'&&x.webSocketDebuggerUrl)||targets.find(x=>x.webSocketDebuggerUrl);if(!page)throw new Error('no page target');cdp=new CDP(page.webSocketDebuggerUrl);await cdp.open();
    const reqs=new Map(),ress=new Map();let loaded=false;
    cdp.on('Network.requestWillBeSent',p=>{const q=p.request||{};reqs.set(p.requestId,{requestId:p.requestId,url:safeUrl(q.url),method:q.method||null,type:p.type||null,graphql:parseGraphqlPost(q.postData)});});
    cdp.on('Network.responseReceived',p=>{const q=p.response||{};ress.set(p.requestId,{requestId:p.requestId,url:safeUrl(q.url),status:q.status,mimeType:q.mimeType||null,type:p.type||null});});
    cdp.on('Page.loadEventFired',()=>{loaded=true;});await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Page.enable');await cdp.send('Page.navigate',{url});const end=Date.now()+13000;while(Date.now()<end&&!loaded)await sleep(150);await sleep(3000);
    const hits=[];
    for(const [requestId,res] of ress){const req=reqs.get(requestId);if(!req)continue;const interesting=/graphql|jackpot|progressive|game/i.test(req.url||'');if(!interesting)continue;let body='';try{body=(await cdp.send('Network.getResponseBody',{requestId}))?.body||'';}catch{continue;}if(body.length>3_000_000||!body.includes(TARGET_ID))continue;let json=null;try{json=JSON.parse(body)}catch{}const bindings=json?objectBindings(json):[];hits.push({url:req.url,status:res.status,mimeType:res.mimeType,method:req.method,signature:requestSignature(req),selectorSignature:selectorSignature(req),graphql:req.graphql,requestVariablesContainTarget:deepContains(req.graphql?.variables,TARGET_SLUG)||deepContains(req.graphql?.variables,TARGET_TITLE),bodyBytes:body.length,bodySha256:sha(body),idPaths:json?idPaths(json):[],sameObjectTargetBindings:bindings,bodyContainsTargetSlug:norm(body).includes(norm(TARGET_SLUG)),bodyContainsTargetTitle:norm(body).includes(norm(TARGET_TITLE)),contexts:contexts(body,TARGET_ID,3)});}
    return{operator:opName,role,slug,url,success:true,loadEventFired:loaded,targetIdResponseCount:hits.length,hits};
  }catch(e){return{operator:opName,role,slug,url,success:false,error:String(e?.message||e),stderr:stderr.slice(0,1000),targetIdResponseCount:0,hits:[]};}
  finally{try{cdp?.close();}catch{}try{proc.kill('SIGKILL');}catch{}await sleep(100);try{fs.rmSync(profile,{recursive:true,force:true});}catch{}}
}

const chrome=findChrome();const browser={available:Boolean(chrome),binary:chrome,version:null};if(chrome){const v=spawnSync(chrome,['--version'],{encoding:'utf8',timeout:5000});browser.version=(v.stdout||v.stderr||'').trim()||null;}
const feedBefore={};for(const [name,op] of Object.entries(OPERATORS))feedBefore[name]=await publicFeed(op);
const pages=[];if(chrome)for(const [name,op] of Object.entries(OPERATORS)){pages.push(await capture(chrome,name,op,TARGET_SLUG,'TARGET'));for(const slug of CONTROL_SLUGS)pages.push(await capture(chrome,name,op,slug,'CONTROL'));}
const feedAfter={};for(const [name,op] of Object.entries(OPERATORS))feedAfter[name]=await publicFeed(op);
const successful=pages.filter(p=>p.success).length,expected=Object.keys(OPERATORS).length*(1+CONTROL_SLUGS.length),complete=Boolean(chrome)&&successful===expected;
const targetPages=pages.filter(p=>p.role==='TARGET'),controlPages=pages.filter(p=>p.role==='CONTROL');
const targetBindings=targetPages.flatMap(p=>p.hits.filter(h=>h.sameObjectTargetBindings.length>0||h.requestVariablesContainTarget).map(h=>({operator:p.operator,slug:p.slug,signature:h.signature,selectorSignature:h.selectorSignature,sameObjectTargetBindings:h.sameObjectTargetBindings,requestVariablesContainTarget:h.requestVariablesContainTarget,idPaths:h.idPaths})));const controlBindings=controlPages.flatMap(p=>p.hits.filter(h=>h.sameObjectTargetBindings.length>0||h.requestVariablesContainTarget).map(h=>({operator:p.operator,slug:p.slug,signature:h.signature,selectorSignature:h.selectorSignature,sameObjectTargetBindings:h.sameObjectTargetBindings,requestVariablesContainTarget:h.requestVariablesContainTarget,idPaths:h.idPaths})));
const discoveryCandidate=targetBindings.length>0&&controlBindings.length===0;
const crossOperatorCandidate=discoveryCandidate&&new Set(targetBindings.map(x=>x.operator)).size===Object.keys(OPERATORS).length;
const out={version:'bouncy-bubbles-passive-identity-v1',generatedAt:new Date().toISOString(),target:{id:TARGET_ID,slug:TARGET_SLUG,title:TARGET_TITLE},browser,feedBefore,feedAfter,coverage:{expectedCaptures:expected,successfulCaptures:successful,complete},pages,comparison:{targetBindingCount:targetBindings.length,controlBindingCount:controlBindings.length,targetBindings,controlBindings,discoveryCandidate,crossOperatorCandidate},decision:{exactFeedToGameIdentityVerified:false,identityCandidateFound:discoveryCandidate,crossOperatorIdentityCandidateFound:crossOperatorCandidate,nextStep:crossOperatorCandidate?'REPLICATE_FRESH_WITH_FROZEN_SAME_OBJECT_OR_SELECTOR_CRITERIA_BEFORE_ANY_IDENTITY_PROMOTION':discoveryCandidate?'REPLICATE_TARGET_BINDING_AND_REQUIRE_SECOND_OPERATOR_OR_INDEPENDENT_SEMANTIC_SOURCE':'PASSIVE_PUBLIC_PAGE_NETWORK_DID_NOT_BIND_EXACT_ID_TO_BURBUJAS; KEEP_IDENTITY_UNVERIFIED_AND_MOVE_TO_RESET_LEVEL_COLLECTION',economicPromotionAllowed:false,realMoneyAllowed:false},guards:{publicPageLoadOnly:true,ephemeralProfiles:true,noLogin:true,noCookiesInjected:true,noClick:true,noRuntimeEvaluate:true,noRequestInterception:true,noGameLaunch:true,noSessionCreation:true,noBetting:true,globalExactIdResponseNeverVerifiesGameIdentity:true,targetBindingRequiresSameObjectOrRequestSelector:true,controlsRequired:true,singleRunNeverPromotesIdentity:true,exactIdentityHardFalseInDiscoveryRun:true,incompleteCoverageNeverInterpretedAsNegative:true,economicPromotionAllowed:false,realMoneyAllowed:false}};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({browser,feedBefore,feedAfter,coverage:out.coverage,comparison:out.comparison,decision:out.decision,pages:pages.map(p=>({operator:p.operator,role:p.role,slug:p.slug,success:p.success,loadEventFired:p.loadEventFired,targetIdResponseCount:p.targetIdResponseCount,error:p.error||null,hits:p.hits.map(h=>({signature:h.signature,selectorSignature:h.selectorSignature,requestVariablesContainTarget:h.requestVariablesContainTarget,sameObjectTargetBindings:h.sameObjectTargetBindings,idPaths:h.idPaths}))}))},null,2));
