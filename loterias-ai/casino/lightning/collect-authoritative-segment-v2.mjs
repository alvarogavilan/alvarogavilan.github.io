#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT='loterias-ai/casino/lightning';
const FREEZE=`${ROOT}/evidence/authoritative-segment-v2-freeze.json`;
const ADDENDUM=`${ROOT}/evidence/authoritative-segment-v2-continuity-addendum-v1.json`;
const DATA=`${ROOT}/data/casinoorg-lightningroulette-segment-v2.jsonl`;
const STATUS=`${ROOT}/evidence/authoritative-segment-v2-status.json`;
const ENDPOINT='https://api-cs.casino.org/svc-evolution-game-events/api/lightningroulette';
const MAX_PAGES=12;
const freeze=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
const addendum=JSON.parse(fs.readFileSync(ADDENDUM,'utf8'));
const startMs=Date.parse(freeze.prospectiveStartsAt);
const maxBridge=Number(freeze.segmentPolicy?.maximumBridgeSeconds);
if(freeze.version!=='authoritative-segment-v2-freeze'||!Number.isFinite(startMs)||maxBridge!==300)throw new Error('segment v2 freeze drift');
if(addendum.version!=='authoritative-segment-v2-continuity-addendum-v1'||addendum.immutable!==true||addendum.policy?.maximumBridgeSecondsRemainsDiagnostic!==300||addendum.policy?.authoritativeAdjacencyMayOverrideClockAlarm!==true||addendum.guards?.sameAuthoritativeEndpointOnly!==true||addendum.guards?.realMoneyAllowed!==false)throw new Error('segment v2 continuity addendum drift');

function normalize(item){
  const d=item?.data||item;
  const roundId=String(item?.id||d?.id||'');
  const rawTs=d?.settledAt||d?.startedAt||null,t=Date.parse(rawTs);
  const winner=Number(d?.result?.outcome?.number);
  const lucky=Array.isArray(d?.result?.luckyNumbersList)?d.result.luckyNumbersList:[];
  if(!roundId||!Number.isFinite(t)||!Number.isInteger(winner)||winner<0||winner>36)return null;
  const allLuckyNumbers=[],allLuckyMultipliers=[];
  for(const x of lucky){const n=Number(x?.number),m=Number(x?.roundedMultiplier??x?.multiplier);if(Number.isInteger(n)&&n>=0&&n<=36&&Number.isFinite(m)&&m>0){allLuckyNumbers.push(n);allLuckyMultipliers.push(m)}}
  return {source:'casinoorg-evolution-public-api',sourceRole:'PRIMARY_STRUCTURED_PUBLIC',endpoint:ENDPOINT,segment:'authoritative-v2',roundId,timestamp:new Date(t).toISOString(),winner,allLuckyNumbers,allLuckyMultipliers,roundIdQuality:'authoritative_source_id',timestampQuality:'authoritative_settled_at',trainingEligible:true,confidenceTier:'A',rawHash:crypto.createHash('sha256').update(JSON.stringify(item)).digest('hex'),realMoney:false};
}
const sameArray=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((x,i)=>Number(x)===Number(b[i]));
const sameRound=(a,b)=>!!a&&!!b&&String(a.roundId)===String(b.roundId)&&String(a.timestamp)===String(b.timestamp)&&Number(a.winner)===Number(b.winner)&&sameArray(a.allLuckyNumbers||[],b.allLuckyNumbers||[])&&sameArray(a.allLuckyMultipliers||[],b.allLuckyMultipliers||[]);
const canonical=r=>JSON.stringify({roundId:r.roundId,timestamp:r.timestamp,winner:r.winner,allLuckyNumbers:r.allLuckyNumbers,allLuckyMultipliers:r.allLuckyMultipliers});
async function fetchPage(page){
  const url=page===0?ENDPOINT:`${ENDPOINT}?page=${page}`;
  const res=await fetch(url,{headers:{accept:'application/json','user-agent':'LoteriasAI-segment-v2/1.3','cache-control':'no-cache, no-store, max-age=0',pragma:'no-cache'}});
  const text=await res.text();if(!res.ok)throw new Error(`segment v2 page ${page} HTTP ${res.status}`);
  let payload;try{payload=JSON.parse(text)}catch{throw new Error(`segment v2 page ${page} invalid JSON`)}
  const items=Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:[];
  if(items.length!==30)throw new Error(`segment v2 endpoint window drift page ${page}: ${items.length}`);
  const normalizedAll=items.map(normalize);
  const invalidItems=normalizedAll.filter(x=>!x).length;
  const rows=normalizedAll.filter(Boolean).filter(r=>Date.parse(r.timestamp)>startMs).sort((a,b)=>a.timestamp.localeCompare(b.timestamp)||a.roundId.localeCompare(b.roundId));
  if(new Set(rows.map(r=>r.roundId)).size!==rows.length)throw new Error(`segment v2 duplicate roundId page ${page}`);
  return {page,url,text,rows,invalidItems,rawItemCount:items.length};
}

fs.mkdirSync(path.dirname(DATA),{recursive:true});fs.mkdirSync(path.dirname(STATUS),{recursive:true});
const existingRows=fs.existsSync(DATA)?fs.readFileSync(DATA,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse):[];
const existingIds=new Set(existingRows.map(r=>String(r.roundId)));
const latestExisting=existingRows.length?[...existingRows].sort((a,b)=>String(a.timestamp).localeCompare(String(b.timestamp))).at(-1):null;

const pages=[];let overlapRow=null,overlapPage=null;
for(let page=0;page<=MAX_PAGES;page++){
  const fetched=await fetchPage(page);pages.push(fetched);
  if(!latestExisting){break;}
  const hit=fetched.rows.find(r=>r.roundId===String(latestExisting.roundId));
  if(hit){overlapRow=hit;overlapPage=page;break;}
  const oldest=fetched.rows[0];
  if(oldest&&Date.parse(oldest.timestamp)<Date.parse(latestExisting.timestamp)-3600000)break;
}
const baseAfter=await fetchPage(0);
const headMovedDuringRecovery=pages[0]?.text!==baseAfter.text;
const allFetchedRowsStructurallyValid=[...pages,baseAfter].every(p=>p.invalidItems===0&&p.rawItemCount===30);
const all=[...pages.flatMap(p=>p.rows),...baseAfter.rows];
const byId=new Map();
for(const r of all){const old=byId.get(r.roundId);if(old&&canonical(old)!==canonical(r))throw new Error(`segment v2 conflicting canonical payload ${r.roundId}`);byId.set(r.roundId,r)}
const normalized=[...byId.values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp)||a.roundId.localeCompare(b.roundId));
const exactRoundIdOverlapVerified=!latestExisting||Boolean(overlapRow);
const overlapSemanticMatch=!latestExisting||sameRound(overlapRow,latestExisting);
const fresh=normalized.filter(r=>!existingIds.has(r.roundId)&&(!latestExisting||Date.parse(r.timestamp)>Date.parse(latestExisting.timestamp)));
const firstFresh=fresh[0]||null,lastFresh=fresh.at(-1)||null;
const bridgeSeconds=latestExisting&&firstFresh?(Date.parse(firstFresh.timestamp)-Date.parse(latestExisting.timestamp))/1000:null;
let recoveredMaxGapSeconds=0;
const continuityRows=latestExisting?[latestExisting,...fresh]:fresh;
for(let i=1;i<continuityRows.length;i++){const d=(Date.parse(continuityRows[i].timestamp)-Date.parse(continuityRows[i-1].timestamp))/1000;if(d<0)throw new Error('segment v2 chronology regression');recoveredMaxGapSeconds=Math.max(recoveredMaxGapSeconds,d)}
const bridgeTimeSafe=!latestExisting||!firstFresh||Boolean(bridgeSeconds>=0&&bridgeSeconds<=maxBridge);
const recoveredContinuitySafe=!fresh.length||recoveredMaxGapSeconds<=maxBridge;
const previousIndex=!latestExisting?-1:normalized.findIndex(r=>r.roundId===String(latestExisting.roundId));
const firstFreshIndex=!firstFresh?-1:normalized.findIndex(r=>r.roundId===String(firstFresh.roundId));
const firstFreshImmediatelyFollowsPrevious=!latestExisting||!firstFresh||(previousIndex>=0&&firstFreshIndex===previousIndex+1);
const recoveredTailCountMatches=!latestExisting||previousIndex<0?false:fresh.length===Math.max(0,normalized.length-previousIndex-1);
const authoritativeAdjacencySafe=!latestExisting||!firstFresh||Boolean(exactRoundIdOverlapVerified&&overlapSemanticMatch&&!headMovedDuringRecovery&&allFetchedRowsStructurallyValid&&firstFreshImmediatelyFollowsPrevious&&recoveredTailCountMatches);
const clockContinuitySafe=bridgeTimeSafe&&recoveredContinuitySafe;
const continuityAcceptedBy=clockContinuitySafe?'CLOCK_LIMIT':authoritativeAdjacencySafe?'AUTHORITATIVE_EVENT_ADJACENCY':null;
const bridgeSafe=exactRoundIdOverlapVerified&&overlapSemanticMatch&&Boolean(clockContinuitySafe||authoritativeAdjacencySafe);
let persistedRows=0;
if(fresh.length&&bridgeSafe){fs.appendFileSync(DATA,fresh.map(r=>JSON.stringify(r)).join('\n')+'\n');persistedRows=fresh.length;}
const finalRows=fs.existsSync(DATA)?fs.readFileSync(DATA,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse):[];
const ids=new Set(finalRows.map(r=>String(r.roundId)));if(ids.size!==finalRows.length)throw new Error('segment v2 persisted duplicate roundId');
if(finalRows.some(r=>Date.parse(r.timestamp)<=startMs))throw new Error('segment v2 contains pre-barrier row');
const ordered=[...finalRows].sort((a,b)=>String(a.timestamp).localeCompare(String(b.timestamp)));
let maxGap=0;for(let i=1;i<ordered.length;i++)maxGap=Math.max(maxGap,(Date.parse(ordered[i].timestamp)-Date.parse(ordered[i-1].timestamp))/1000);
const state=!bridgeSafe?'SEGMENT_V2_QUARANTINED_CONTINUITY_FAILURE':continuityAcceptedBy==='AUTHORITATIVE_EVENT_ADJACENCY'?'SEGMENT_V2_ACCUMULATING_CLEAN_ADJACENCY_RECOVERED':finalRows.length?'SEGMENT_V2_ACCUMULATING_CLEAN':'SEGMENT_V2_WAITING_FIRST_POST_BARRIER_ROUND';
const status={version:'authoritative-segment-v2-status',generatedAt:new Date().toISOString(),freezeVersion:freeze.version,continuityAddendumVersion:addendum.version,prospectiveStartsAt:freeze.prospectiveStartsAt,
  source:{endpoint:ENDPOINT,httpStatus:200,received:baseAfter.rows.length,eligibleInRecoveredUnion:normalized.length,responseSha256:crypto.createHash('sha256').update(baseAfter.text).digest('hex'),pagesFetched:pages.length,overlapPage,headMovedDuringRecovery,allFetchedRowsStructurallyValid},
  progress:{rows:finalRows.length,persistedThisRun:persistedRows,firstAt:ordered[0]?.timestamp??null,lastAt:ordered.at(-1)?.timestamp??null,latestRoundId:ordered.at(-1)?.roundId??null},
  continuity:{previousRoundId:latestExisting?.roundId??null,previousLastAt:latestExisting?.timestamp??null,sourceWindowContainsPreviousRound:exactRoundIdOverlapVerified,previousRoundSemanticMatch:overlapSemanticMatch,firstFreshAt:firstFresh?.timestamp??null,lastFreshAt:lastFresh?.timestamp??null,bridgeSeconds,maximumBridgeSeconds:maxBridge,bridgeTimeSafe,recoveredMaxGapSeconds,recoveredContinuitySafe,firstFreshImmediatelyFollowsPrevious,recoveredTailCountMatches,authoritativeAdjacencySafe,continuityAcceptedBy,bridgeSafe,maxObservedInterRoundSeconds:maxGap},
  state,
  guards:{strictlyPostBarrier:true,exactPreviousRoundOverlapRequiredAfterFirstCapture:true,previousRoundSemanticMatchRequired:true,paginatedRecoveryAllowedOnlySameAuthoritativeSource:true,wallClockLimitRemainsDiagnostic:true,authoritativeAdjacencyOverrideRequiresStableHead:true,authoritativeAdjacencyOverrideRequiresStructurallyValidRows:true,oldAmbiguousGapImported:false,alternateSourceUsed:false,automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0}};
fs.writeFileSync(STATUS,JSON.stringify(status,null,2)+'\n');console.log(JSON.stringify(status,null,2));if(!bridgeSafe)process.exit(2);
