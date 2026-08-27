import assert from 'node:assert/strict';
import {evaluateBetfairSportingHarOverduePair,validateBetfairSportingHarSnapshot} from '../casino/jackpots/betfair-sporting-har-overdue-bridge-v1.mjs';

const VERSION='betfair-sporting-har-overdue-bridge-v1.10-code-owned-latency-dryrun';
const exactLauncher=()=>({startedDateTime:new Date(1989*1000).toISOString(),request:{method:'GET',url:'https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=ap-mccoy-sporting-legends-cptn&launchProduct=casino&mode=real&returnURL=https%3A%2F%2Fcasino.betfair.es%2Fjuego%2Fap-mccoy-sporting-legends-cptn&switchedToPopup=true',headers:[]},response:{status:200,headers:[],content:{text:''}}});
const otherLauncher=()=>({startedDateTime:new Date(1989.5*1000).toISOString(),request:{method:'GET',url:'https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=another-playtech-game-cptn&launchProduct=casino&mode=real',headers:[]},response:{status:200,headers:[],content:{text:''}}});
const config=(casino='bf_es',ticker='https://tickers.playtech.example/new_jackpotxml.php',cacheBust='',extra={})=>({request:{method:'GET',url:`https://launcher.betfair.es/initialResources/es_ES_desktop${cacheBust?`?cacheBust=${cacheBust}`:''}`,headers:[]},response:{status:200,headers:[],content:{mimeType:'application/json',text:JSON.stringify({jackpotsCasino:casino,jackpotsCasinoUrl:ticker,...extra})}}});
const ticker=(gameTimestamp,amount,winCount=42,casino='bf_es',ght=2000)=>({startedDateTime:new Date(gameTimestamp*1000).toISOString(),request:{method:'GET',url:`https://tickers.playtech.example/new_jackpotxml.php?casino=${casino}&currency=EUR&game=sljp-1&local=0&winc=0`,headers:[]},response:{status:200,headers:[],content:{mimeType:'text/xml',text:`<request casino="${casino}" currency="eur" game="sljp-1" startTimestamp="${gameTimestamp-10}" execInterval="10"/><gamedata game="sljp-1" gamegroup="sljp" local="0" timestamp="${gameTimestamp}" winc="${winCount}"><amount currency="EUR" guaranteedHitTime="${ght}" step="0.01" wins="1000">${amount}</amount></gamedata>`}}});
const har=(gameTimestamp,amount,winCount=42,casino='bf_es',ght=2000,cacheBust='',extra={})=>({log:{entries:[exactLauncher(),config(casino,'https://tickers.playtech.example/new_jackpotxml.php',cacheBust,extra),ticker(gameTimestamp,amount,winCount,casino,ght)]}});

let r=validateBetfairSportingHarSnapshot(har(1990,100),{sourceName:'before.har'});
assert.equal(r.version,VERSION);
assert.equal(r.valid,true);
assert.equal(r.snapshot.code,'sljp-1');
assert.equal(r.snapshot.guaranteedHitTime,2000);
assert.equal(r.exactApMcCoyRealLauncherBindingVerified,true);
assert.equal(r.latestPostLaunchInitialResourcesBindingVerified,true);
assert.equal(r.latestPairedTickerPollSelected,true);
assert.equal(r.realMoneyAllowed,false);

r=validateBetfairSportingHarSnapshot({log:{entries:[config(),ticker(1990,100)]}},{sourceName:'no-launcher.har'});
assert.equal(r.valid,false);
assert.equal(r.reason,'EXACT_AP_MCCOY_REAL_LAUNCHER_BINDING_NOT_FOUND');

r=validateBetfairSportingHarSnapshot({log:{entries:[exactLauncher(),config(),otherLauncher(),ticker(1990,100)]}},{sourceName:'stale-launcher.har'});
assert.equal(r.valid,false);
assert.equal(r.reason,'LATEST_REAL_CASINO_LAUNCHER_NOT_AP_MCCOY');
assert.equal(r.hardGuards.staleApMcCoyLauncherCannotAuthorizeLaterDifferentGameTicker,true);

const fake='a'.repeat(40);
const latencyMeasurement={measuredActionLatencySeconds:2.4,sampleCount:20,protocolId:'apmccoy-manual-action-latency-v1',method:'manual-click-to-request-observation',selectedUsingPostGhtSurvivalOutcomes:false};
r=evaluateBetfairSportingHarOverduePair({
  beforeHar:har(1990,100,42,'bf_es',2000,'before'),
  afterHar:har(2005,100.02,42,'bf_es',2000,'after'),
  decisionNowEpochSeconds:2010,
  stakeEUR:0.25,
  stakeReviewCommit:fake,
  actionLatencyMeasurement:latencyMeasurement,
  actionLatencyReviewCommit:fake,
  // These legacy fields are deliberately ignored by the bridge.
  measuredActionLatencyVerified:true,
  measuredActionLatencySeconds:0.01,
  prospectiveDryRunCycleVerified:true,
});
assert.equal(r.version,VERSION);
assert.equal(r.valid,true);
assert.equal(r.operatorFollowingDayRuleVerifiedFromCodeOwnedCurrentEvidence,true);
assert.equal(r.providerGhtBoundarySemanticsVerifiedFromCodeOwnedEvidence,true);
assert.equal(r.currentDailyAmountExactVerifiedFromValidatedServerSnapshot,true);
assert.equal(r.stakeAtDecisionExactVerifiedFromCodeOwnedReview,false);
assert.equal(r.measuredActionLatencyVerifiedFromCodeOwnedReview,false);
assert.equal(r.actionLatencyReview.valid,false);
assert.equal(r.actionLatencyReview.reason,'ACTION_LATENCY_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED');
assert.equal(r.prospectiveDryRunCycleDerivedFromStructuredRaceEvidence,false);
assert.equal(r.finalEvaluation.executionGates.measuredActionLatencyVerified,false);
assert.equal(r.finalEvaluation.executionGates.prospectiveDryRunCycleVerified,false);
assert.equal(r.finalEvaluation.followingDayUnawardedVerified,true);
assert.equal(r.finalEvaluation.nextEligibleNetworkBetGuaranteedJackpot,true);
assert.equal(r.hardGuards.callerSemanticStakeAmountLatencyAndDryRunBooleansCannotCloseGates,true);
assert.equal(r.hardGuards.latencyReviewMayRemainOpenWithoutDiscardingValidCrossGhtResearch,true);
assert.equal(r.decision,'NO_PLAY');
assert.equal(r.realMoneyAllowed,false);
assert.equal(r.maxSpins,0);

const withMenu=evaluateBetfairSportingHarOverduePair({
  beforeHar:har(1990,100,42,'bf_es',2000,'before'),
  afterHar:har(2005,100.02,42,'bf_es',2000,'after',{availableTotalBets:[0.10,0.25,0.50]}),
  decisionNowEpochSeconds:2010,stakeEUR:0.25,stakeReviewCommit:fake,
  actionLatencyMeasurement:latencyMeasurement,actionLatencyReviewCommit:fake,
});
assert.equal(withMenu.valid,true);
assert.equal(withMenu.stakeReview.reason,'STAKE_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED');
assert.deepEqual(withMenu.stakeReview.servedTotalStakeValuesEUR,[0.1,0.25,0.5]);
assert.equal(withMenu.actionLatencyReview.reason,'ACTION_LATENCY_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED');
assert.equal(withMenu.realMoneyAllowed,false);

const syntheticRaceEvidence={totalDryRunCycles:2,cycleIds:['c1','c2']};
const derived=evaluateBetfairSportingHarOverduePair({beforeHar:har(1990,100),afterHar:har(2005,100.02),decisionNowEpochSeconds:2010,raceEvidence:syntheticRaceEvidence});
assert.equal(derived.valid,true);
assert.equal(derived.prospectiveDryRunCycleDerivedFromStructuredRaceEvidence,true);
assert.equal(derived.finalEvaluation.executionGates.prospectiveDryRunCycleVerified,false);
assert.equal(derived.finalEvaluation.executionGates.structuredProspectiveRaceEvidenceVerified,false);
assert.equal(derived.realMoneyAllowed,false);

const equalTime=evaluateBetfairSportingHarOverduePair({beforeHar:har(2005,100,42,'bf_es',2010),afterHar:har(2005,100.01,42,'bf_es',2010),decisionNowEpochSeconds:2011});
assert.equal(equalTime.valid,false);
assert.equal(equalTime.reason,'HAR_CAPTURE_ORDER_NOT_FORWARD');

const reset=evaluateBetfairSportingHarOverduePair({beforeHar:har(1990,100,42),afterHar:har(2005,90,43),decisionNowEpochSeconds:2010});
assert.equal(reset.valid,true);
assert.equal(reset.finalEvaluation.reason,'JACKPOT_WIN_COUNT_CHANGED');
assert.equal(reset.realMoneyAllowed,false);

const changedIms=evaluateBetfairSportingHarOverduePair({beforeHar:har(1990,100,42,'bf_es'),afterHar:har(2005,100.02,42,'other_es'),decisionNowEpochSeconds:2010});
assert.equal(changedIms.valid,false);
assert.equal(changedIms.reason,'IMS_CHANGED_BETWEEN_CAPTURES');

console.log('betfair-sporting-har-overdue-bridge-v1.test.mjs: PASS');
