#!/usr/bin/env node
import fs from 'node:fs';
import { finiteNumberOrNull } from './number-safety-v1.mjs';
import { dynamicFreshnessForMeter } from './meter-stasis-core-v1.mjs';

// A killed lane must never become executionReady again, even if a later
// registry edit sets a threshold/stake for it - the lifecycle status is a
// hard override that always wins over the economic/identity gates.
export function laneExecutionReadyWithLifecycle(lifecycleStatus, edgePass, exactStakeKnown, strategyVerified) {
  if (lifecycleStatus === 'KILLED_NOT_CURRENTLY_ACTIONABLE') return false;
  return edgePass === true && exactStakeKnown === true && strategyVerified === true;
}

// Guarded so importing laneExecutionReadyWithLifecycle for tests never
// triggers this script's real file reads/writes as a side effect.
if (import.meta.url === `file://${process.argv[1]}`) {
const SINGLE='loterias-ai/edge-live/evidence/edge-live-execution-plan-v1.json';
const NETWORK='loterias-ai/edge-live/evidence/botemania-all-network-live-state-v1.json';
const REGISTRY='loterias-ai/edge-live/opportunity-registry-v1.json';
const STASIS='loterias-ai/edge-live/evidence/meter-stasis-ledger-v1.json';
const OUT='loterias-ai/edge-live/evidence/edge-live-multi-execution-plan-v1.json';
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const now=new Date().toISOString();
const single=read(SINGLE)||{};
const network=read(NETWORK)||{};
const registry=read(REGISTRY)||{};
const stasis=read(STASIS)||{};
const ageSeconds=t=>{const n=Date.parse(t||'');return Number.isFinite(n)?Math.max(0,Math.floor((Date.now()-n)/1000)):null};
const sourceAgeSeconds=ageSeconds(network?.observedAt);
const sourceFresh=sourceAgeSeconds!==null&&sourceAgeSeconds<=180;

const lanes=[];
const singleGreen=single?.state==='READY_TO_EXECUTE_MANUALLY'&&single?.order?.action==='PLAY';
const singleYellow=!singleGreen&&single?.state==='PREPARE_OPEN_GAME_NO_BET'&&single?.order?.action==='OPEN_GAME_ONLY_NO_BET';
lanes.push({id:'botemania-jackpot-king',type:'MUST_BE_WON_BY_PROGRESSIVE_NETWORK',game:single?.game||{id:'fishin-frenzy-jackpot-king',name:"Fishin' Frenzy: Jackpot King",url:'https://www.botemania.es/juegos/slots-online/fishin-frenzy-jackpot-king'},phase:singleGreen?'GREEN':singleYellow?'YELLOW':'RED',executionReady:singleGreen,prepareOnly:singleYellow,order:single?.order||{action:'DO_NOT_PLAY',stakePerSpinEUR:0,maxSpins:0,maxTotalStakeEUR:0},evidence:single?.evidence||{},blockers:Array.isArray(single?.blockers)?single.blockers:[],sourcePlan:'edge-live-execution-plan-v1.json'});

const mappings=Array.isArray(registry?.mappings)?registry.mappings:[];
for(const m of mappings){
  const key=`${m.network}:${m.feedId}`;
  const row=network?.currentByKey?.[key]||null;
  const jackpotEUR=finiteNumberOrNull(row?.amountEUR);
  const meter=stasis?.meters?.[key]||null;
  const dynamicFreshness=dynamicFreshnessForMeter(meter,{maxStasisSeconds:1800});
  const exactIdentity=m?.identity?.verified===true;
  const exactThresholdEUR=finiteNumberOrNull(m?.economic?.breakEvenJackpotEUR);
  const thresholdEURKnown=exactThresholdEUR!==null&&exactThresholdEUR>0;
  const breakEvenCredits=finiteNumberOrNull(m?.economic?.breakEvenRoyalCredits);
  const creditValueEUR=finiteNumberOrNull(m?.economic?.creditValueEUR);
  const creditValueVerified=m?.economic?.creditValueVerified===true&&creditValueEUR!==null&&creditValueEUR>0;
  const computedThresholdEUR=!thresholdEURKnown&&breakEvenCredits!==null&&breakEvenCredits>0&&creditValueVerified?breakEvenCredits*creditValueEUR:null;
  const threshold=thresholdEURKnown?exactThresholdEUR:computedThresholdEUR;
  const thresholdKnown=threshold!==null&&threshold>0;
  const currentStateFresh=sourceFresh&&dynamicFreshness.verified===true;
  const edgePass=exactIdentity&&currentStateFresh&&jackpotEUR!==null&&thresholdKnown&&jackpotEUR>=threshold;
  const stakeConfigured=finiteNumberOrNull(m?.execution?.stakePerDecisionEUR);
  const exactStakeKnown=m?.execution?.exactStakeKnown===true&&stakeConfigured!==null&&stakeConfigured>0;
  const strategyVerified=m?.execution?.strategyVerified===true;
  // A killed lane must never become executionReady again just because a
  // later registry edit sets a threshold/stake - the lifecycle status is a
  // hard override, checked last so it always wins.
  const lifecycleStatus=typeof m?.lifecycle?.status==='string'?m.lifecycle.status:null;
  const killed=lifecycleStatus==='KILLED_NOT_CURRENTLY_ACTIONABLE';
  const executionReady=laneExecutionReadyWithLifecycle(lifecycleStatus,edgePass,exactStakeKnown,strategyVerified);
  const blockers=[];
  if(killed)blockers.push('LANE_KILLED_NOT_CURRENTLY_ACTIONABLE');
  if(!row)blockers.push('LIVE_COUNTER_NOT_FOUND');
  if(!exactIdentity)blockers.push('LIVE_COUNTER_IDENTITY_NOT_VERIFIED');
  if(!sourceFresh)blockers.push('SOURCE_NOT_FRESH');
  if(!dynamicFreshness.verified)blockers.push('DYNAMIC_METER_FRESHNESS_NOT_VERIFIED');
  if(!thresholdKnown)blockers.push('BREAK_EVEN_THRESHOLD_EUR_NOT_VERIFIED');
  if(jackpotEUR!==null&&thresholdKnown&&jackpotEUR<threshold)blockers.push('CURRENT_STATE_BELOW_BREAK_EVEN');
  if(edgePass&&!exactStakeKnown)blockers.push('EXACT_STAKE_NOT_VERIFIED');
  if(edgePass&&!strategyVerified)blockers.push('EXECUTION_STRATEGY_NOT_VERIFIED');
  const stake=executionReady?stakeConfigured:0;
  const configuredMax=finiteNumberOrNull(m?.execution?.maxTotalStakeEUR);
  const maxTotal=executionReady?(configuredMax??stake):0;
  const maxSpins=executionReady?Math.max(1,Math.floor(maxTotal/stake)):0;
  lanes.push({
    id:m.id,type:m.type,game:m.game,monitor:{network:m.network,feedId:m.feedId,key},phase:executionReady?'GREEN':'RED',executionReady,prepareOnly:false,
    lifecycle:{status:lifecycleStatus,killed,reason:m?.lifecycle?.reason||null,aliasOf:m?.lifecycle?.aliasOf||null},
    current:{observedAt:network?.observedAt||null,jackpotEUR,sourceAgeSeconds,sourceFresh,currentStateFresh,dynamicFreshnessVerified:dynamicFreshness.verified,dynamicFreshnessReason:dynamicFreshness.reason,stasisSeconds:dynamicFreshness.stasisSeconds??meter?.stasisSeconds??null,lastChangedAt:meter?.lastChangedAt||null,observationCount:meter?.observationCount||0,changeCount:meter?.changeCount||0},
    economic:{breakEvenJackpotEUR:thresholdKnown?+threshold.toFixed(6):null,breakEvenRoyalCredits:breakEvenCredits,creditValueEUR:creditValueVerified?creditValueEUR:null,creditValueVerified,aboveBreakEven:edgePass,distanceToBreakEvenEUR:jackpotEUR!==null&&thresholdKnown?+(threshold-jackpotEUR).toFixed(6):null},
    order:{action:executionReady?'PLAY':'DO_NOT_PLAY',stakePerSpinEUR:stake,maxSpins,maxTotalStakeEUR:maxTotal,validFrom:executionReady?network?.observedAt:null,validUntil:executionReady?new Date(Date.now()+180000).toISOString():null,maxSignalAgeSeconds:180,requiresFinalGreenRecheckBeforeFirstSpin:true},
    evidence:{identityVerified:exactIdentity,identityEvidence:m.identity||{},thresholdKnown,exactStakeKnown,strategyVerified,sourceFresh,dynamicFreshnessVerified:dynamicFreshness.verified,currentStateFresh,withinFreshExecutionWindow:currentStateFresh,structurePass:exactIdentity,economicPass:edgePass},
    blockers,
    guards:{noAutomaticBetting:true,manualExecutionOnly:true,noThresholdUnitAssumption:true,noUnverifiedCounterMapping:true,httpFreshnessDoesNotEqualDynamicFreshness:true,dynamicFreshnessRequiredForExecution:true}
  });
}

const green=lanes.filter(x=>x.executionReady===true);
const yellow=lanes.filter(x=>x.prepareOnly===true);
const selected=green[0]||yellow[0]||lanes[0];
const state=green.length?'READY_TO_EXECUTE_MANUALLY':yellow.length?'PREPARE_OPEN_GAME_NO_BET':'NO_EXECUTION';
const out={version:'edge-live-multi-execution-plan-v1.2-dynamic-freshness',generatedAt:now,operator:'botemania-es',state,game:selected?.game||{id:'none',name:'Sin oportunidad validada',url:'https://www.botemania.es/'},order:selected?.order||{action:'DO_NOT_PLAY',stakePerSpinEUR:0,maxSpins:0,maxTotalStakeEUR:0},evidence:selected?.evidence||{structurePass:false,economicPass:false,exactStakeKnown:false,sourceFresh:false,dynamicFreshnessVerified:false,currentStateFresh:false,withinFreshExecutionWindow:false},blockers:selected?.blockers||['NO_TRACKED_LANE_READY'],selectedLaneId:selected?.id||null,coverage:{trackedLanes:lanes.length,greenLanes:green.length,yellowLanes:yellow.length,liveFeedRows:finiteNumberOrNull(network?.coverage?.totalRows)??0,uniqueLiveRows:finiteNumberOrNull(network?.coverage?.uniqueIdentityRows)??0,ambiguousLiveRows:finiteNumberOrNull(network?.coverage?.ambiguousIdentityRows)??0,sourceObservedAt:network?.observedAt||null,sourceAgeSeconds,stasisMeters:Object.keys(stasis?.meters||{}).length},lanes,interpretation:green.length?'At least one lane passed all currently encoded execution gates including dynamic current-state freshness. Final live recheck remains mandatory before any wager.':yellow.length?'At least one lane is in preparation-only state; no wager is authorized.':'No tracked lane currently passes the full economic, state-freshness and execution gate.',guards:{nullNeverCoercedToZero:true,httpFreshnessDoesNotEqualDynamicFreshness:true,dynamicFreshnessRequiredForExecution:true,noAutomaticBetting:true,manualExecutionOnly:true,finalGreenRecheckMandatory:true,noPromotionsRequired:true,noUnverifiedIdentityPromotion:true,noUnverifiedThresholdPromotion:true,realMoneyAllowed:green.length>0}};
fs.mkdirSync('loterias-ai/edge-live/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({state:out.state,selectedLaneId:out.selectedLaneId,coverage:out.coverage,wagerBet:lanes.find(x=>x.monitor?.key==='generic:WAGER_BET')||null},null,2));
}
