#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const OUT='loterias-ai/casino/jackpots/evidence/botemania-gamesys-crossmarket-pool-proof-v1.json';
const UA='loterias-ai-gamesys-crossmarket-pool-proof/1.0';
const BOTEMANIA='https://www.botemania.es/es/graphql';
const ECB='https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
const TRACKERS=[
  {id:'wizardofpots-jackpotjoy',url:'https://www.wizardofpots.com/casinos/jackpotjoy/',currency:'GBP'},
  {id:'wizardofpots-virgingames',url:'https://www.wizardofpots.com/casinos/virgingames/',currency:'GBP'},
  {id:'casinolistings-gamesys',url:'https://www.casinolistings.com/jackpots/gamesys',currency:'GBP'},
  {id:'jackpotscout-gamesys',url:'https://jackpotscout.net/providers/gamesys',currency:'EUR'},
  {id:'jackpotscout-playtech-fallback',url:'https://jackpotscout.net/providers/playtech',currency:'EUR'},
  {id:'lcb-gamesys',url:'https://lcb.org/jackpots/gamesys',currency:'GBP'}
];
const TARGETS=[
  {botemaniaId:'diamondbonanza25BTM',externalNames:['Diamond Bonanza 25p']},
  {botemaniaId:'WAGER_BET',externalNames:['Progressive Jacks or Better','Jacks or Better Progressive']},
  {botemaniaId:'classicwildsprogressive',externalNames:['Classic Wilds']},
  {botemaniaId:'DealOrNoDealStateful3',externalNames:['Deal or No Deal 5p','Deal or No Deal 10p','Deal or No Deal 20p']}
];

function sha(s){return crypto.createHash('sha256').update(s).digest('hex');}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
async function getText(url,{method='GET',headers={},body=null,timeout=15000}={}){
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),timeout);
  try{
    const r=await fetch(url,{method,headers:{'user-agent':UA,'cache-control':'no-cache',...headers},body,redirect:'follow',signal:ctrl.signal});
    const text=await r.text();
    return {ok:r.ok,status:r.status,url:r.url,text,sha256:sha(text),fetchedAt:new Date().toISOString()};
  } finally { clearTimeout(timer); }
}
function decodeEntities(s){return s.replace(/&pound;|&#163;/gi,'£').replace(/&euro;|&#8364;/gi,'€').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ');}
function numberFromLocale(raw){
  let s=String(raw).replace(/[^0-9.,]/g,'');
  if(!s)return null;
  const lastComma=s.lastIndexOf(','),lastDot=s.lastIndexOf('.');
  if(lastComma>=0&&lastDot>=0){
    if(lastComma>lastDot)s=s.replace(/\./g,'').replace(',','.'); else s=s.replace(/,/g,'');
  } else if(lastComma>=0){
    const tail=s.length-lastComma-1;
    s=tail===3?s.replace(/,/g,''):s.replace(',','.');
  } else if(lastDot>=0){
    const tail=s.length-lastDot-1;
    if(tail===3)s=s.replace(/\./g,'');
  }
  const n=Number(s); return Number.isFinite(n)?n:null;
}
function extractNearName(html,name,currency){
  const text=decodeEntities(html);
  const lower=text.toLowerCase(),needle=name.toLowerCase();
  const hits=[]; let p=0;
  while(hits.length<20){const i=lower.indexOf(needle,p);if(i<0)break;hits.push(i);p=i+needle.length;}
  const symbol=currency==='GBP'?'£':'€';
  const candidates=[];
  for(const i of hits){
    const window=text.slice(Math.max(0,i-800),Math.min(text.length,i+name.length+1200));
    const re=currency==='GBP'?/£\s*([0-9][0-9.,\s]{0,20})/g:/€\s*([0-9][0-9.,\s]{0,20})/g;
    for(const m of window.matchAll(re)){
      const n=numberFromLocale(m[1]);
      if(n!==null&&n>0)candidates.push({amount:n,raw:`${symbol}${m[1].trim()}`,distance:Math.abs((Math.max(0,i-800)+(m.index||0))-i),context:window.slice(Math.max(0,(m.index||0)-90),Math.min(window.length,(m.index||0)+160))});
    }
  }
  candidates.sort((a,b)=>a.distance-b.distance);
  return {name,occurrences:hits.length,candidates:candidates.slice(0,8)};
}
async function fetchBotemania(){
  const query='query loadJackpots { jackpots { id amount } }';
  const x=await getText(BOTEMANIA,{method:'POST',headers:{accept:'application/json','content-type':'application/json',venture:'botemania_es',origin:'https://www.botemania.es',referer:'https://www.botemania.es/'},body:JSON.stringify({query})});
  let json=null; try{json=JSON.parse(x.text);}catch{}
  const rows=(json?.data?.jackpots||[]).map(r=>({id:String(r?.id||''),amountEUR:Number(r?.amount)})).filter(r=>r.id&&Number.isFinite(r.amountEUR));
  return {...x,text:undefined,jsonParsed:!!json,errors:json?.errors||[],rows};
}
async function fetchEcb(){
  try{
    const x=await getText(ECB,{headers:{accept:'application/xml,text/xml,*/*'}});
    const m=x.text.match(/currency=['\"]GBP['\"]\s+rate=['\"]([0-9.]+)['\"]/i);
    return {...x,text:undefined,gbpPerEUR:m?Number(m[1]):null};
  }catch(e){return {ok:false,status:null,error:String(e?.message||e),gbpPerEUR:null};}
}
async function fetchTracker(t){
  try{
    const x=await getText(t.url,{headers:{accept:'text/html,*/*'}});
    const matches=[];
    for(const target of TARGETS) for(const name of target.externalNames){
      const e=extractNearName(x.text,name,t.currency);
      if(e.occurrences||e.candidates.length)matches.push({botemaniaId:target.botemaniaId,...e});
    }
    return {id:t.id,url:t.url,currency:t.currency,ok:x.ok,status:x.status,finalUrl:x.url,bytes:x.text.length,sha256:x.sha256,fetchedAt:x.fetchedAt,matches};
  }catch(e){return {id:t.id,url:t.url,currency:t.currency,ok:false,status:null,error:String(e?.name||e?.message||e),matches:[]};}
}
function bestExternalForTarget(trackers,targetId,gbpPerEUR){
  const out=[];
  for(const t of trackers){
    for(const m of t.matches.filter(x=>x.botemaniaId===targetId)){
      for(const c of m.candidates){
        const amountEUR=t.currency==='GBP'&&gbpPerEUR?c.amount/gbpPerEUR:t.currency==='EUR'?c.amount:null;
        if(amountEUR)out.push({tracker:t.id,sourceCurrency:t.currency,name:m.name,sourceAmount:c.amount,amountEUR,raw:c.raw,distance:c.distance,context:c.context});
      }
    }
  }
  return out;
}
function assess(botRows,trackers,gbpPerEUR){
  const byId=new Map(botRows.map(r=>[r.id,r.amountEUR]));
  const comparisons=[];
  for(const target of TARGETS){
    const bot=byId.get(target.botemaniaId);
    if(!Number.isFinite(bot))continue;
    const candidates=bestExternalForTarget(trackers,target.botemaniaId,gbpPerEUR).map(c=>({...c,relativeError:Math.abs(c.amountEUR-bot)/Math.max(bot,1)}));
    candidates.sort((a,b)=>a.relativeError-b.relativeError);
    comparisons.push({botemaniaId:target.botemaniaId,botemaniaEUR:bot,best:candidates[0]||null,candidates:candidates.slice(0,12)});
  }
  const matched1pct=comparisons.filter(x=>x.best&&x.best.relativeError<=0.01);
  const matched3pct=comparisons.filter(x=>x.best&&x.best.relativeError<=0.03);
  return {comparisons,matchedWithin1Pct:matched1pct.length,matchedWithin3Pct:matched3pct.length,independentTargetsWithin1Pct:matched1pct.map(x=>x.botemaniaId),independentTargetsWithin3Pct:matched3pct.map(x=>x.botemaniaId)};
}

const startedAt=new Date().toISOString();
const bot=await fetchBotemania();
await sleep(250);
const [ecb,...trackerResults]=await Promise.all([fetchEcb(),...TRACKERS.map(fetchTracker)]);
const assessment=assess(bot.rows,trackerResults,ecb.gbpPerEUR);
const strongSnapshotEvidence=assessment.matchedWithin1Pct>=2;
const indicativeSnapshotEvidence=!strongSnapshotEvidence&&assessment.matchedWithin3Pct>=2;
const out={
  version:'botemania-gamesys-crossmarket-pool-proof-v1',generatedAt:new Date().toISOString(),startedAt,
  purpose:'TEST WHETHER SPAIN-FACING BOTEMANIA GAMESYS/ROXOR PROGRESSIVES SHARE THE SAME UNDERLYING POOLS AS LONG-RUN PUBLIC GAMESYS TRACKERS; NO THRESHOLD TRANSFER FROM ONE SNAPSHOT',
  botemania:{endpoint:BOTEMANIA,publicNoAuth:true,httpStatus:bot.status,ok:bot.ok,fetchedAt:bot.fetchedAt,responseSha256:bot.sha256,jsonParsed:bot.jsonParsed,errors:bot.errors,rows:bot.rows},
  fx:{source:ECB,httpStatus:ecb.status??null,ok:ecb.ok??false,gbpPerEUR:ecb.gbpPerEUR??null,fetchedAt:ecb.fetchedAt??null,error:ecb.error??null},
  trackers:trackerResults,
  assessment:{...assessment,strongSnapshotEvidence,indicativeSnapshotEvidence,
    interpretation:strongSnapshotEvidence?'AT_LEAST_TWO_INDEPENDENT_GAME_METERS_MATCH_EXTERNAL_GAMESYS VALUES_WITHIN_1PCT_AFTER_FX_SAME_RUN_STRONG_SHARED_POOL_EVIDENCE_NOT_YET_CONFIGURATION_EQUIVALENCE':indicativeSnapshotEvidence?'AT_LEAST_TWO_METERS_MATCH_WITHIN_3PCT_AFTER_FX_INDICATIVE_SHARED_POOL_EVIDENCE_REQUIRES_REPEATED_DELTA_MATCH':'NO_MULTI_TITLE_SNAPSHOT_MATCH; DO_NOT INFER SHARED GLOBAL POOL'},
  nextProof:['Repeat on >=3 separated observations and compare direction/magnitude of meter deltas after FX','Observe at least one reset/hit simultaneously on Botemania and the external tracker','For each title, verify exact denomination/stake/rules fingerprint before importing any historical break-even or hit distribution','Never use tracker SCORE or foreign threshold as a Spanish execution threshold without configuration identity'],
  execution:{identityVerified:false,thresholdVerified:false,stakeVerified:false,strategyVerified:false,rulesFingerprintVerified:false,prospectiveValidationPassed:false,realMoneyAllowed:false,decision:'NO_PLAY'},
  guards:{noPromotion:true,noBetting:true,noAuthentication:true,noCookies:true,noTrackerThresholdTransfer:true,noSingleSnapshotAsConfigurationProof:true,noCrossCurrencyWithoutFx:true,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({botemaniaRows:bot.rows,gbpPerEUR:ecb.gbpPerEUR,assessment:out.assessment,decision:out.execution},null,2));
