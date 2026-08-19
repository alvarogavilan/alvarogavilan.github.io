#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const ROOT='loterias-ai/casino/standard-roulette';
const FREEZE=JSON.parse(fs.readFileSync(`${ROOT}/evidence/independent-streams-v1-freeze.json`,'utf8'));
const ADDENDUM=JSON.parse(fs.readFileSync(`${ROOT}/evidence/official-venue-addendum-v1.json`,'utf8'));
const VENUE_POLICY=JSON.parse(fs.readFileSync('loterias-ai/casino/official-venue-policy-v1.json','utf8'));
if(FREEZE.version!=='standard-roulette-independent-streams-v1-freeze'||FREEZE.guards?.strictlyPostBarrier!==true||FREEZE.guards?.realMoneyAllowed!==false)throw new Error('standard roulette freeze drift');
if(ADDENDUM.policyVersion!=='official-venue-policy-v1'||ADDENDUM.operationalRule?.scheduleOnMainCaptureCycle!==false||ADDENDUM.operationalRule?.manualAuxiliaryResearchOnly!==true||ADDENDUM.operationalRule?.doNotPromoteFromAuxiliaryFeed!==true)throw new Error('official venue addendum drift');
if(VENUE_POLICY?.evidencePolicy?.thirdPartyOutcomeFeedMayPromoteEconomicClaimByItself!==false)throw new Error('venue policy promotion guard drift');
if(process.env.ALLOW_AUXILIARY_RESEARCH!=='1')throw new Error('AUXILIARY_RESEARCH_ONLY: set ALLOW_AUXILIARY_RESEARCH=1 for an explicit manual research run; do not schedule this collector');
const approved=new Map(ADDENDUM.streams.map(x=>[x.id,x]));
for(const stream of FREEZE.streams){const a=approved.get(stream.id);if(!a?.officialAvailabilityConfirmed||a?.officialOperator!=='pokerstars.es'||a?.currentCollectorPromotionEligible!==false)throw new Error(`stream ${stream.id} is not approved by the PokerStars/PlayUZU allowlist`);}
const barrier=Date.parse(FREEZE.prospectiveStartsAt);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
fs.mkdirSync(`${ROOT}/data`,{recursive:true});fs.mkdirSync(`${ROOT}/evidence`,{recursive:true});

const lightningIds=new Set();
for(const p of ['loterias-ai/casino/lightning/data/casinoorg-lightningroulette-segment-v2.jsonl','loterias-ai/casino/xxxtreme/data/casinoorg-xxxtremelightningroulette-segment-v1.jsonl']){
  if(fs.existsSync(p))for(const line of fs.readFileSync(p,'utf8').split(/\r?\n/).filter(Boolean)){try{const r=JSON.parse(line);if(r.roundId)lightningIds.add(String(r.roundId));}catch{}}
}

const streamResults=[];const allNewIds=new Map();
for(const stream of FREEZE.streams){
  const venue=approved.get(stream.id);
  const dataPath=`${ROOT}/data/${stream.id}-segment-v1.jsonl`, statusPath=`${ROOT}/evidence/${stream.id}-segment-v1-status.json`;
  const existing=fs.existsSync(dataPath)?fs.readFileSync(dataPath,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse):[];
  existing.sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
  const prev=existing.at(-1)||null;
  const res=await fetch(stream.endpoint,{headers:{accept:'application/json','user-agent':'loterias-ai-standard-roulette/1.0'}});
  const text=await res.text();let body=null;try{body=JSON.parse(text)}catch{}
  const rows=Array.isArray(body)?body:[];
  if(!res.ok)throw new Error(`${stream.id} http ${res.status}`);
  const normalized=rows.map(x=>({
    roundId:String(x?.id??x?.data?.id??''),
    timestamp:String(x?.data?.settledAt??''),
    startedAt:String(x?.data?.startedAt??''),
    winner:Number(x?.data?.result?.outcome?.number),
    source:stream.endpoint,
    sourceRole:'AUXILIARY_RESEARCH_ONLY',
    officialOperator:venue.officialOperator,
    officialGameName:venue.officialGameName,
    officialAvailabilityConfirmed:true,
    promotionEligibleFromThisSource:false,
    rawHash:sha(JSON.stringify(x)),
    trainingEligibleWinner:true,
    realMoney:false
  })).filter(r=>r.roundId&&Number.isInteger(r.winner)&&r.winner>=0&&r.winner<=36&&Number.isFinite(Date.parse(r.timestamp))).sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
  const post=normalized.filter(r=>Date.parse(r.timestamp)>barrier);
  let overlapSafe=true, semanticSafe=true, bridgeSeconds=null;
  if(prev){const match=normalized.find(r=>r.roundId===prev.roundId);overlapSafe=Boolean(match);semanticSafe=Boolean(match&&match.timestamp===prev.timestamp&&match.winner===prev.winner);if(post.length)bridgeSeconds=(Date.parse(post.find(r=>Date.parse(r.timestamp)>Date.parse(prev.timestamp))?.timestamp||prev.timestamp)-Date.parse(prev.timestamp))/1000;}
  if(!overlapSafe||!semanticSafe)throw new Error(`${stream.id} continuity overlap failed`);
  const seen=new Set(existing.map(r=>r.roundId));
  const fresh=post.filter(r=>!seen.has(r.roundId));
  for(const r of fresh){if(lightningIds.has(r.roundId))throw new Error(`${stream.id} cross-stream roundId collision ${r.roundId}`);for(const [other,idset] of allNewIds){if(idset.has(r.roundId))throw new Error(`${stream.id} collision with ${other}: ${r.roundId}`)}}
  const ids=new Set(fresh.map(r=>r.roundId));allNewIds.set(stream.id,ids);
  const merged=[...existing,...fresh].sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
  if(merged.some(r=>Date.parse(r.timestamp)<=barrier))throw new Error(`${stream.id} pre-barrier row contamination`);
  fs.writeFileSync(dataPath,merged.map(r=>JSON.stringify(r)).join('\n')+(merged.length?'\n':''));
  let maxGap=0;for(let i=1;i<merged.length;i++)maxGap=Math.max(maxGap,(Date.parse(merged[i].timestamp)-Date.parse(merged[i-1].timestamp))/1000);
  const status={version:'standard-roulette-stream-v1-status',generatedAt:new Date().toISOString(),streamId:stream.id,freezeVersion:FREEZE.version,prospectiveStartsAt:FREEZE.prospectiveStartsAt,venue:{officialOperator:venue.officialOperator,officialGameName:venue.officialGameName,officialAvailabilityConfirmed:true},source:{endpoint:stream.endpoint,role:'AUXILIARY_RESEARCH_ONLY',operatorOfficial:false,promotionEligibleByItself:false,httpStatus:res.status,received:rows.length,normalized:normalized.length,responseSha256:sha(text)},progress:{rows:merged.length,persistedThisRun:fresh.length,firstAt:merged[0]?.timestamp??null,lastAt:merged.at(-1)?.timestamp??null,latestRoundId:merged.at(-1)?.roundId??null},continuity:{previousRoundId:prev?.roundId??null,sourceWindowContainsPreviousRound:overlapSafe,previousRoundSemanticMatch:semanticSafe,bridgeSeconds,maxObservedInterRoundSeconds:maxGap,bridgeSafe:overlapSafe&&semanticSafe&&(bridgeSeconds===null||bridgeSeconds<=600)},crossStream:{referenceIdsChecked:lightningIds.size,roundIdOverlapCount:0,independentByRoundId:true,mergeForbidden:true},economics:{straightUpProfitPayout:'35:1',baseGrossReturnX:36,baseEconomicBreakEvenHitRate:1/36,officialVenueReplicationRequired:true},guards:{strictlyPostBarrier:true,preBarrierRowsImported:false,scheduledExecutionForbidden:true,auxiliaryResearchOnly:true,officialVenueEvidenceRequiredBeforePromotion:true,automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0}};
  if(status.continuity.bridgeSafe!==true)throw new Error(`${stream.id} bridge unsafe`);
  fs.writeFileSync(statusPath,JSON.stringify(status,null,2)+'\n');
  streamResults.push({streamId:stream.id,rows:merged.length,fresh:fresh.length,lastAt:status.progress.lastAt,role:'AUXILIARY_RESEARCH_ONLY'});
}
console.log(JSON.stringify({version:'standard-roulette-independent-streams-v1-collector',mode:'MANUAL_AUXILIARY_RESEARCH_ONLY',streams:streamResults,promotionEligible:false,realMoneyAllowed:false},null,2));
