#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT='loterias-ai/casino/lightning';
const DATA=`${ROOT}/data/casinoorg-lightningroulette.jsonl`;
const OUT=`${ROOT}/evidence/casinoorg-gap-recovery-v1.json`;
const QUAR=`${ROOT}/evidence/casinoorg-catchup-quarantine.json`;
const BASE='https://api-cs.casino.org/svc-evolution-game-events/api/lightningroulette';
const MAX_PAGES=20;
const MAX_ATTEMPTS=5;
const MAX_INTERVAL_SECONDS=120;

function parseStored(){
  const rows=fs.readFileSync(DATA,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const ids=new Set(rows.map(r=>String(r.roundId||'')).filter(Boolean));
  const valid=rows.map(r=>({roundId:String(r.roundId||''),timestamp:new Date(Date.parse(r.timestamp??r.ts)).toISOString(),winner:Number(r.winner)})).filter(r=>r.roundId&&Number.isFinite(Date.parse(r.timestamp))).sort((a,b)=>a.timestamp.localeCompare(b.timestamp)||a.roundId.localeCompare(b.roundId));
  if(!valid.length)throw new Error('authoritative corpus has no timestamped rows');
  return{rows,ids,latest:valid.at(-1)};
}
function normalize(item){
  const d=item?.data||item,roundId=String(item?.id||d?.id||''),rawTs=d?.settledAt||d?.startedAt||null,t=Date.parse(rawTs),winner=Number(d?.result?.outcome?.number),lucky=Array.isArray(d?.result?.luckyNumbersList)?d.result.luckyNumbersList:[];
  if(!roundId||!Number.isFinite(t)||!Number.isInteger(winner)||winner<0||winner>36)return null;
  const luckyNumbers=[],luckyMultipliers=[];
  for(const x of lucky){const n=Number(x?.number),m=Number(x?.roundedMultiplier??x?.multiplier);if(Number.isInteger(n)&&n>=0&&n<=36&&Number.isFinite(m)&&m>0){luckyNumbers.push(n);luckyMultipliers.push(m)}}
  return{source:'casinoorg-evolution-public-api',sourceRole:'PRIMARY_STRUCTURED_PUBLIC',endpoint:BASE,roundId,timestamp:new Date(t).toISOString(),winner,allLuckyNumbers:luckyNumbers,allLuckyMultipliers:luckyMultipliers,roundIdQuality:'authoritative_source_id',timestampQuality:'authoritative_settled_at',trainingEligible:true,confidenceTier:'A',rawHash:crypto.createHash('sha256').update(JSON.stringify(item)).digest('hex'),realMoney:false};
}
async function fetchPage(page){
  const url=page===0?BASE:`${BASE}?page=${page}`;
  const r=await fetch(url,{headers:{accept:'application/json','user-agent':'LoteriasAI-gap-recovery/1.1','cache-control':'no-cache, no-store, max-age=0',pragma:'no-cache'}});
  const text=await r.text();if(!r.ok)throw new Error(`page ${page} HTTP ${r.status}`);
  let payload;try{payload=JSON.parse(text)}catch{throw new Error(`page ${page} invalid JSON`)}
  const items=Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:[];
  const rows=items.map(normalize).filter(Boolean).sort((a,b)=>b.timestamp.localeCompare(a.timestamp)||a.roundId.localeCompare(b.roundId));
  if(items.length!==30||rows.length!==30)throw new Error(`page ${page} expected 30 valid rows, got ${items.length}/${rows.length}`);
  if(new Set(rows.map(x=>x.roundId)).size!==30)throw new Error(`page ${page} duplicate round ids`);
  return{page,url,bodyHash:crypto.createHash('sha256').update(text).digest('hex'),rows,newest:rows[0],oldest:rows.at(-1)};
}
function maxGapSeconds(rows){let m=0;for(let i=1;i<rows.length;i++){const d=(Date.parse(rows[i].timestamp)-Date.parse(rows[i-1].timestamp))/1000;if(d<0)throw new Error('rows not chronological');m=Math.max(m,d);}return m;}
function canonical(r){return JSON.stringify({timestamp:r.timestamp,winner:r.winner,allLuckyNumbers:r.allLuckyNumbers,allLuckyMultipliers:r.allLuckyMultipliers});}

const before=parseStored();
let snapshot=null,lastError=null;
for(let attempt=1;attempt<=MAX_ATTEMPTS;attempt++){
  try{
    const baseBefore=await fetchPage(0),pages=[baseBefore];let overlapPage=null;
    for(let p=1;p<=MAX_PAGES;p++){
      const page=await fetchPage(p);pages.push(page);
      const overlapIds=page.rows.filter(r=>before.ids.has(r.roundId)).map(r=>r.roundId);
      if(overlapIds.length){overlapPage={page:p,overlapIds};break;}
      if(Date.parse(page.oldest.timestamp)<Date.parse(before.latest.timestamp)-3600000)throw new Error('passed stored head by >1h without exact roundId overlap');
    }
    if(!overlapPage)throw new Error(`no exact roundId overlap within ${MAX_PAGES} pages`);

    // A live roulette head may advance while older pages are fetched. Do not require an
    // impossible identical page-0 hash; instead prove the UNION itself is contiguous.
    const baseAfter=await fetchPage(0);
    const headMovedDuringRecovery=baseAfter.bodyHash!==baseBefore.bodyHash;
    const all=[...pages.flatMap(p=>p.rows),...baseAfter.rows];
    const byId=new Map();
    for(const r of all){
      const old=byId.get(r.roundId);
      if(old&&canonical(old)!==canonical(r))throw new Error(`conflicting canonical payload for roundId ${r.roundId}`);
      byId.set(r.roundId,r);
    }
    const unique=[...byId.values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp)||a.roundId.localeCompare(b.roundId));
    const newRows=unique.filter(r=>Date.parse(r.timestamp)>Date.parse(before.latest.timestamp)&&!before.ids.has(r.roundId));
    if(!newRows.length)throw new Error('overlap-verified pages contain no missing newer rows');

    const firstBridge=(Date.parse(newRows[0].timestamp)-Date.parse(before.latest.timestamp))/1000;
    const combined=[before.latest,...newRows];
    const maxGap=maxGapSeconds(combined);
    const sourceNewest=[baseBefore.newest,baseAfter.newest].sort((a,b)=>a.timestamp.localeCompare(b.timestamp)).at(-1);
    const tailBridge=(Date.parse(sourceNewest.timestamp)-Date.parse(newRows.at(-1).timestamp))/1000;
    if(firstBridge<0||firstBridge>MAX_INTERVAL_SECONDS)throw new Error(`first recovered bridge ${firstBridge}s exceeds ${MAX_INTERVAL_SECONDS}s`);
    if(maxGap>MAX_INTERVAL_SECONDS)throw new Error(`recovered union max gap ${maxGap}s exceeds ${MAX_INTERVAL_SECONDS}s`);
    if(tailBridge<0||tailBridge>MAX_INTERVAL_SECONDS)throw new Error(`recovered tail bridge ${tailBridge}s exceeds ${MAX_INTERVAL_SECONDS}s`);

    const pageTransitions=[];
    for(let i=1;i<pages.length;i++){
      const newer=pages[i-1].oldest,older=pages[i].newest;
      pageTransitions.push({fromPage:pages[i-1].page,toPage:pages[i].page,seconds:(Date.parse(newer.timestamp)-Date.parse(older.timestamp))/1000});
    }
    snapshot={attempt,pagesFetched:pages.length-1,baseBeforeHash:baseBefore.bodyHash,baseAfterHash:baseAfter.bodyHash,headMovedDuringRecovery,overlapPage,pageTransitions,newRows,firstBridge,maxGap,tailBridge,sourceNewest,sourceOldestFetched:pages.at(-1).oldest};
    break;
  }catch(e){lastError=String(e?.message||e);}
}
if(!snapshot)throw new Error(`gap recovery failed closed after ${MAX_ATTEMPTS} attempts: ${lastError}`);

fs.appendFileSync(DATA,snapshot.newRows.map(r=>JSON.stringify(r)).join('\n')+'\n');
const after=parseStored();
if(after.rows.length!==before.rows.length+snapshot.newRows.length)throw new Error('post-append corpus count mismatch');
if(new Set(after.rows.map(r=>String(r.roundId||''))).size!==after.rows.length)throw new Error('post-append duplicate roundId detected');
const quarantineExistedBeforeRecovery=fs.existsSync(QUAR);
if(quarantineExistedBeforeRecovery)fs.rmSync(QUAR);
const report={version:'casinoorg-gap-recovery-v2',generatedAt:new Date().toISOString(),status:'RECOVERED_CONTIGUOUS_AUTHORITATIVE_GAP',source:BASE,recoveryAttempt:snapshot.attempt,previousCorpusLatest:before.latest,pagesFetchedThrough:snapshot.pagesFetched,overlapPage:snapshot.overlapPage,pageTransitions:snapshot.pageTransitions,sourceNewest:snapshot.sourceNewest,sourceOldestFetched:snapshot.sourceOldestFetched,recoveredRows:snapshot.newRows.length,recoveredFirst:{roundId:snapshot.newRows[0].roundId,timestamp:snapshot.newRows[0].timestamp},recoveredLast:{roundId:snapshot.newRows.at(-1).roundId,timestamp:snapshot.newRows.at(-1).timestamp},firstBridgeSeconds:snapshot.firstBridge,maxInterRoundSeconds:snapshot.maxGap,tailBridgeSeconds:snapshot.tailBridge,corpusRowsBefore:before.rows.length,corpusRowsAfter:after.rows.length,exactRoundIdOverlapVerified:true,continuityUnionVerified:true,canonicalDuplicateConflicts:0,sourceHeadMovedDuringRecovery:snapshot.headMovedDuringRecovery,stableHeadHashVerified:!snapshot.headMovedDuringRecovery,quarantineExistedBeforeRecovery,quarantineClearedAfterRecovery:!fs.existsSync(QUAR),policy:{sameAuthoritativeSourceOnly:true,noTargetRetuning:true,liveHeadMayAdvanceOnlyIfUnionContinuityProvesNoGap:true,mayAdvanceProspectivesAfterAllIntegrityChecks:true},guards:{futureInformationUsedForSelection:false,automaticBettingAllowed:false,realMoneyAllowed:false}};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
