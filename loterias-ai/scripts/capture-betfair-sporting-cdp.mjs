#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {analyzeSafeHarText} from './analyze-betfair-sporting-har.mjs';

const GAME_ID='ap-mccoy-sporting-legends-cptn';
const EVIDENCE_RE=/(initialResources|jackpotsCasino|jackpotsCasinoUrl|liveEndpointUrl|new_jackpotxml\.php|webtickers|sljp-1|tonymc|guaranteedHitTime|instanceCode)/i;
const BODY_TYPES=new Set(['XHR','Fetch','Document','Other']);

function finite(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function endpointShape(raw){
  try{const u=new URL(String(raw||''));return `${u.protocol}//${u.host}${u.pathname}`;}catch{return null;}
}
function betfairOwned(raw){
  try{const u=new URL(String(raw||''));const h=u.hostname.toLowerCase();return h==='betfair.es'||h.endsWith('.betfair.es');}catch{return false;}
}
function isInitialResources(raw){
  try{const u=new URL(String(raw||''));return betfairOwned(raw)&&/\/initialresources(?:\/|$)/i.test(u.pathname);}catch{return false;}
}
export function isEligibleBetfairSportingTarget(raw){
  try{
    const u=new URL(String(raw||''));
    if(!betfairOwned(raw))return false;
    if(u.hostname.toLowerCase()==='launcher.betfair.es')return u.searchParams.get('gameId')===GAME_ID||u.searchParams.get('gameid')===GAME_ID;
    return /\/juego\/ap-mccoy-sporting-legends-cptn(?:\/|$)/i.test(u.pathname)||/\/game\/ap-mccoy-sporting-legends-cptn(?:\/|$)/i.test(u.pathname);
  }catch{return false;}
}
function privateRoot(cwd=process.cwd()){return path.resolve(cwd,'.git','edge-private');}
export function defaultPrivateCapturePath({cwd=process.cwd(),epochMs=Date.now()}={}){
  const stamp=new Date(Number(epochMs)).toISOString().replace(/[:.]/g,'-');
  return path.join(privateRoot(cwd),`betfair-sporting-${stamp}.har`);
}
export function isPrivateCapturePath(candidate,{cwd=process.cwd()}={}){
  if(!candidate)return false;
  const root=privateRoot(cwd),resolved=path.resolve(candidate),rel=path.relative(root,resolved);
  return rel!==''&&!rel.startsWith('..')&&!path.isAbsolute(rel)&&/\.har$/i.test(resolved);
}
export function discoverConfiguredTickerEndpointsFromText(text){
  const s=String(text||'').replace(/\\+\//g,'/').replace(/\\u0026/gi,'&');
  const out=[];
  for(const m of s.matchAll(/https:\/\/[^\s"'<>\\]+/gi)){
    const raw=m[0].replace(/[),;]+$/,'');
    if(/new_jackpotxml\.php|\/webtickers\/?(?:[?#]|$)/i.test(raw)){
      const ep=endpointShape(raw);if(ep)out.push(ep);
    }
  }
  return [...new Set(out)];
}
function entryEvidenceText(entry){
  return [
    entry?.request?.url||'',
    entry?.request?.postData?.text||'',
    entry?.response?.content?.text||'',
    ...(entry?._webSocketMessages||[]).map(x=>x?.data||''),
  ].join('\n');
}
export function filterRelevantCaptureEntries(entries,{configuredEndpoints=[]}={}){
  const configured=new Set(configuredEndpoints.map(endpointShape).filter(Boolean));
  return (Array.isArray(entries)?entries:[]).filter(entry=>{
    const url=String(entry?.request?.url||'');
    const ep=endpointShape(url);
    if(isInitialResources(url))return true;
    if(ep&&configured.has(ep))return true;
    return EVIDENCE_RE.test(entryEvidenceText(entry));
  });
}
function usage(){
  return 'Usage: node loterias-ai/scripts/capture-betfair-sporting-cdp.mjs [--port 9222] [--seconds 90] [--out .git/edge-private/<name>.har]';
}
async function fetchTargets(port){
  const r=await fetch(`http://127.0.0.1:${port}/json`);
  if(!r.ok)throw new Error(`CDP_TARGET_LIST_HTTP_${r.status}`);
  const arr=await r.json();return Array.isArray(arr)?arr:[];
}
function pickTarget(targets){
  const eligible=targets.filter(t=>t?.type==='page'&&isEligibleBetfairSportingTarget(t?.url)&&/^ws:\/\//i.test(String(t?.webSocketDebuggerUrl||'')));
  if(!eligible.length)return null;
  return eligible.find(t=>/^https:\/\/launcher\.betfair\.es\//i.test(String(t.url)))||eligible[0];
}
function makeRpc(ws){
  let id=0;const pending=new Map();
  ws.addEventListener('message',ev=>{
    let msg;try{msg=JSON.parse(String(ev.data));}catch{return;}
    if(!msg?.id)return;
    const p=pending.get(msg.id);if(!p)return;pending.delete(msg.id);
    if(msg.error)p.reject(new Error(msg.error.message||'CDP_ERROR'));else p.resolve(msg.result||{});
  });
  return (method,params={})=>new Promise((resolve,reject)=>{
    const current=++id;pending.set(current,{resolve,reject});ws.send(JSON.stringify({id:current,method,params}));
  });
}
function toHeadersArray(){return [];}
function entryFromRequest(ev){
  const req=ev.request||{};
  const postData=req.postData?{mimeType:req.headers?.['Content-Type']||req.headers?.['content-type']||null,text:String(req.postData)}:undefined;
  const wall=finite(ev.wallTime);
  return {
    startedDateTime:wall!==null?new Date(wall*1000).toISOString():new Date().toISOString(),
    request:{method:req.method||null,url:req.url||null,headers:toHeadersArray(),...(postData?{postData}: {})},
    response:{status:null,headers:[],content:{mimeType:null,text:''}},
    _resourceType:ev.type||null,
    _requestId:ev.requestId,
  };
}
function bodyWorthFetching(type){return BODY_TYPES.has(String(type||''));}
function bodyHasEvidence(text){return EVIDENCE_RE.test(String(text||''));}
function safeSummary(result,outFile,targetUrl,seconds){
  return {
    version:'betfair-sporting-passive-cdp-capture-v1.1-private-only',
    ok:true,
    targetEndpoint:endpointShape(targetUrl),
    captureSeconds:seconds,
    privateHarPath:outFile,
    warning:'RAW HAR IS LOCAL-PRIVATE EVIDENCE. DO NOT COMMIT OR SHARE IT. Share only the sanitized analyzer output.',
    analysis:result,
    execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0},
    hardGuards:{localhostCdpOnly:true,networkObservationOnly:true,noPageNavigationCommands:true,noClicks:true,noWagerProbe:true,noAutomaticBetting:true,noRequestHeadersPersisted:true,targetQueryNeverEmitted:true,rawHarAlwaysUnderGitPrivateDir:true},
  };
}

export async function captureFromExistingChrome({port=9222,seconds=90,outFile=null}={}){
  const p=finite(port),s=finite(seconds);
  if(p===null||p<=0||p>65535)throw new Error('INVALID_CDP_PORT');
  if(s===null||s<=0||s>3600)throw new Error('INVALID_CAPTURE_SECONDS');
  const targets=await fetchTargets(Math.trunc(p));
  const target=pickTarget(targets);
  if(!target)throw new Error('EXACT_BETFAIR_SPORTING_TAB_NOT_FOUND');
  if(typeof WebSocket!=='function')throw new Error('NODE_WEBSOCKET_UNAVAILABLE_USE_NODE_22_PLUS');

  const ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',()=>reject(new Error('CDP_WEBSOCKET_OPEN_FAILED')),{once:true});});
  const rpc=makeRpc(ws);
  const records=new Map();
  const configuredEndpoints=new Set();
  const getBodyQueue=new Set();

  ws.addEventListener('message',async ev=>{
    let msg;try{msg=JSON.parse(String(ev.data));}catch{return;}
    const pms=msg?.params||{};
    if(msg?.method==='Network.requestWillBeSent'){
      records.set(pms.requestId,entryFromRequest(pms));
      return;
    }
    if(msg?.method==='Network.responseReceived'){
      const e=records.get(pms.requestId)||entryFromRequest({requestId:pms.requestId,request:{url:pms.response?.url,method:'GET'},type:pms.type});
      e.response={status:Number.isFinite(pms.response?.status)?pms.response.status:null,headers:[],content:{mimeType:pms.response?.mimeType||null,text:''}};
      e._resourceType=pms.type||e._resourceType||null;records.set(pms.requestId,e);return;
    }
    if(msg?.method==='Network.loadingFinished'){
      const e=records.get(pms.requestId);if(!e||!bodyWorthFetching(e._resourceType)||getBodyQueue.has(pms.requestId))return;
      getBodyQueue.add(pms.requestId);
      try{
        const body=await rpc('Network.getResponseBody',{requestId:pms.requestId});
        const text=body?.base64Encoded?Buffer.from(String(body.body||''),'base64').toString('utf8'):String(body?.body||'');
        if(isInitialResources(e.request?.url)||bodyHasEvidence(text)){
          e.response.content.text=text;
          for(const ep of discoverConfiguredTickerEndpointsFromText(text))configuredEndpoints.add(ep);
        } else if(configuredEndpoints.has(endpointShape(e.request?.url))){
          e.response.content.text=text;
        }
      }catch{}
      return;
    }
    if(msg?.method==='Network.webSocketCreated'){
      const e=records.get(pms.requestId)||{startedDateTime:new Date().toISOString(),request:{method:'GET',url:pms.url||null,headers:[]},response:{status:101,headers:[],content:{mimeType:'application/websocket',text:''}},_resourceType:'WebSocket',_requestId:pms.requestId};
      e._webSocketMessages=e._webSocketMessages||[];records.set(pms.requestId,e);return;
    }
    if(msg?.method==='Network.webSocketFrameReceived'||msg?.method==='Network.webSocketFrameSent'){
      const e=records.get(pms.requestId);if(!e)return;
      const data=String(pms.response?.payloadData||'');
      e._webSocketMessages=e._webSocketMessages||[];
      e._webSocketMessages.push({type:msg.method.endsWith('Sent')?'send':'receive',time:Date.now()/1000,opcode:pms.response?.opcode??1,data});
    }
  });

  await rpc('Network.enable',{});
  await new Promise(resolve=>setTimeout(resolve,Math.trunc(s*1000)));
  try{await rpc('Network.disable',{});}catch{}
  try{ws.close();}catch{}

  const entries=filterRelevantCaptureEntries([...records.values()],{configuredEndpoints:[...configuredEndpoints]}).map(({_resourceType,_requestId,...e})=>e);
  const har={log:{version:'1.2',creator:{name:'Loterias AI passive CDP capture',version:'1.1'},entries}};
  const finalOut=outFile?path.resolve(outFile):defaultPrivateCapturePath();
  if(!isPrivateCapturePath(finalOut))throw new Error('OUTFILE_MUST_BE_UNDER_GIT_EDGE_PRIVATE');
  fs.mkdirSync(path.dirname(finalOut),{recursive:true,mode:0o700});
  fs.writeFileSync(finalOut,JSON.stringify(har,null,2),{encoding:'utf8',mode:0o600});
  try{fs.chmodSync(finalOut,0o600);}catch{}
  const sanitized=analyzeSafeHarText(JSON.stringify(har),{sourceName:path.basename(finalOut),nowEpochSeconds:Math.floor(Date.now()/1000)});
  return safeSummary(sanitized,finalOut,target.url,Math.trunc(s));
}

export async function main(argv=process.argv.slice(2)){
  if(argv.includes('--help')||argv.includes('-h')){process.stdout.write(`${usage()}\n`);return 0;}
  const value=(flag,def)=>{const i=argv.indexOf(flag);return i>=0?argv[i+1]:def;};
  const port=value('--port',9222),seconds=value('--seconds',90),out=value('--out',null);
  try{
    const result=await captureFromExistingChrome({port,seconds,outFile:out});
    process.stdout.write(`${JSON.stringify(result,null,2)}\n`);return 0;
  }catch(error){
    process.stdout.write(`${JSON.stringify({version:'betfair-sporting-passive-cdp-capture-v1.1-private-only',ok:false,reason:String(error?.message||error),usage:usage(),execution:{decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0}},null,2)}\n`);return 1;
  }
}

if(import.meta.url===`file://${process.argv[1]}`)main().then(code=>{process.exitCode=code;});
