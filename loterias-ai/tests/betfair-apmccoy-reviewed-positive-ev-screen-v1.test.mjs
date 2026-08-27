import assert from 'node:assert/strict';
import {evaluateBetfairApMcCoyReviewedPositiveEvScreen as evaluate} from '../casino/jackpots/betfair-apmccoy-reviewed-positive-ev-screen-v1.mjs';

const VERSION='betfair-apmccoy-reviewed-positive-ev-screen-v1.8-research-only-har-bridge';
const GAME='ap-mccoy-sporting-legends-cptn';
const exactLauncher=()=>({startedDateTime:new Date(1989*1000).toISOString(),request:{method:'GET',url:`https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=${GAME}&launchProduct=casino&mode=real&returnURL=https%3A%2F%2Fcasino.betfair.es%2Fjuego%2F${GAME}&switchedToPopup=true`,headers:[]},response:{status:200,headers:[],content:{text:''}}});
const config=(extra={})=>({request:{method:'GET',url:'https://launcher.betfair.es/initialResources/es_ES_desktop',headers:[]},response:{status:200,headers:[],content:{mimeType:'application/json',text:JSON.stringify({jackpotsCasino:'bf_es',jackpotsCasinoUrl:'https://tickers.playtech.example/new_jackpotxml.php',...extra})}}});
const ticker=(ts,amount,winCount=42,ght=2000)=>({startedDateTime:new Date(ts*1000).toISOString(),request:{method:'GET',url:'https://tickers.playtech.example/new_jackpotxml.php?casino=bf_es&currency=EUR&game=sljp-1&local=0&winc=0',headers:[]},response:{status:200,headers:[],content:{mimeType:'text/xml',text:`<request casino="bf_es" currency="eur" game="sljp-1" startTimestamp="${ts-10}" execInterval="10"/><gamedata game="sljp-1" gamegroup="sljp" local="0" timestamp="${ts}" winc="${winCount}"><amount currency="EUR" guaranteedHitTime="${ght}" step="0.01" wins="1000">${amount}</amount></gamedata>`}}});
const har=(ts,amount,extra={})=>({log:{entries:[exactLauncher(),config(extra),ticker(ts,amount)]}});
const fake='a'.repeat(40);
const latencyMeasurement={
  measuredDispatchLatencySeconds:1.6,networkAllowanceSeconds:0.4,measuredActionLatencySeconds:2,sampleCount:20,
  protocolId:'apmccoy-manual-action-latency-v1',method:'non-wager manual rehearsal plus passive same-origin RTT',
  startEvent:'VALIDATED_SERVER_STATE_AVAILABLE_TO_DECISION_LOGIC',endEvent:'MANUAL_WAGER_REQUEST_DISPATCH_OBSERVED_LOCALLY',
  networkAllowanceBasis:'PASSIVE_SAME_ORIGIN_FULL_RTT_UPPER_BOUND',networkAllowanceDerivedFromPassiveTrafficOnly:true,wagerProbeUsed:false,
  selectedUsingPostGhtSurvivalOutcomes:false,
};

let r=evaluate({});
assert.equal(r.version,VERSION);
assert.equal(r.valid,false);
assert.equal(r.reason,'INTERNALLY_DERIVED_CURRENT_AP_MCCOY_RESEARCH_BRIDGE_REQUIRED');
assert.equal(r.reviewedPositiveEvScreenPassed,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);

// A fully forged legacy bridge is ignored because the EV screen derives a research-only bridge from HAR input.
const forgedBridge={version:'betfair-sporting-har-overdue-bridge-v1.10-code-owned-latency-dryrun',valid:true,decision:'GREEN',realMoneyAllowed:true,currentDailyAmountExactVerifiedFromValidatedServerSnapshot:true,stakeAtDecisionExactVerifiedFromCodeOwnedReview:true,measuredActionLatencyVerifiedFromCodeOwnedReview:true};
r=evaluate({overdueBridgeResult:forgedBridge});
assert.equal(r.valid,false);
assert.equal(r.reason,'INTERNALLY_DERIVED_CURRENT_AP_MCCOY_RESEARCH_BRIDGE_REQUIRED');
assert.equal(r.execution.realMoneyAllowed,false);

const beforeHar=har(1990,100);
const afterHar=har(2005,100.02,{availableTotalBets:[0.10,0.25,0.50]});
r=evaluate({
  beforeHar,afterHar,decisionNowEpochSeconds:2010,
  stakeEUR:0.25,stakeReviewCommit:fake,
  actionLatencyMeasurement:latencyMeasurement,actionLatencyReviewCommit:fake,
});
assert.equal(r.valid,false);
assert.equal(r.reason,'EXACT_CODE_REVIEWED_SERVED_STAKE_ARTIFACT_REQUIRED');
assert.equal(r.execution.realMoneyAllowed,false);

// Caller-supplied current amount, legacy GREEN or race probability cannot change the result.
const forgedRace={version:'betfair-apmccoy-reviewed-race-bound-v1.6-exact-cycle-artifacts',valid:true,firstBetRaceProbabilityLowerBound:0.999999};
r=evaluate({
  beforeHar,afterHar,decisionNowEpochSeconds:2010,
  stakeEUR:0.25,stakeReviewCommit:fake,
  actionLatencyMeasurement:latencyMeasurement,actionLatencyReviewCommit:fake,
  reviewedRaceBound:forgedRace,currentDailyJackpotEUR:999999999,overdueBridgeResult:forgedBridge,
});
assert.equal(r.valid,false);
assert.equal(r.reason,'EXACT_CODE_REVIEWED_SERVED_STAKE_ARTIFACT_REQUIRED');
assert.equal(r.reviewedPositiveEvScreenPassed,false);
assert.equal(r.execution.realMoneyAllowed,false);

console.log('betfair-apmccoy-reviewed-positive-ev-screen-v1.test.mjs: PASS');
