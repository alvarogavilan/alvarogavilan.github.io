import assert from 'node:assert/strict';
import {evaluateSportingLegendsOverdueGreenRoute} from '../casino/jackpots/sporting-legends-overdue-green-route-v1.mjs';

const currentBase={code:'sljp-1',requestCasino:'BETFAIR_ES_IMS',instanceCode:'sporting',local:0,currency:'EUR',guaranteedHitTime:1000,winCount:7,amount:100.02,requestExecInterval:10};
const before={...currentBase,gameTimestamp:999};
const after={...currentBase,gameTimestamp:1001,amount:100.03};
const dryBase={...currentBase,guaranteedHitTime:900,winCount:6,amount:99};
const dryRun={cycleId:'cycle-1',protocolFrozenAtEpochSeconds:800,recordedAtEpochSeconds:904,beforeBoundary:{...dryBase,gameTimestamp:899},detection:{...dryBase,gameTimestamp:901,amount:99.01},confirmation:{...dryBase,gameTimestamp:903,amount:99.02}};
const base={before,after,nowEpochSeconds:1002,exactBetfairSpainTickerImsBindingVerified:true,expectedBetfairImsCasino:'BETFAIR_ES_IMS',betfairFirstBetFollowingDayRuleVerified:true,providerGuaranteedHitTimeDefinesFollowingDayBoundaryVerified:true,conservativeBaseRtpPct:93.03,stakeEUR:0.25,currentDailyAmountExactVerified:true,stakeAtDecisionExactVerified:true,measuredActionLatencySeconds:0.4,measuredActionLatencyVerified:true,frozenActionLatencyCeilingSeconds:2,frozenProtocolId:'p1',dryRunCycles:[dryRun]};

let r=evaluateSportingLegendsOverdueGreenRoute(base);
assert.equal(r.version,'sporting-legends-overdue-green-route-v1.4-retired-research-only');
assert.equal(r.decision,'NO_PLAY');
assert.equal(r.realMoneyAllowed,false);
assert.equal(r.realStakeEUR,0);
assert.equal(r.maxSpins,0);
assert.equal(r.maxTotalStakeEUR,0);
assert.equal(r.usableForExecution,false);
assert.equal(r.reason,'LEGACY_SPORTING_LEGENDS_GREEN_ROUTE_RETIRED_RESEARCH_ONLY');
assert.equal(r.guards.legacyGreenRouteRetired,true);
assert.equal(r.guards.researchOnly,true);
assert.equal(r.guards.legacyGreenCannotPropagate,true);
assert.equal(r.guards.exactArtifactOperatorSpecificPipelineRequiredForAnyFuturePromotion,true);

const closed={...base,binomialIidAssumptionJustified:true,completeProspectiveCycleLedgerVerified:true,currentCycleExchangeabilityVerified:true,assumptionEvidenceId:'race-model-assumptions-v1'};
r=evaluateSportingLegendsOverdueGreenRoute(closed);
assert.equal(r.version,'sporting-legends-overdue-green-route-v1.4-retired-research-only');
assert.equal(r.decision,'NO_PLAY');
assert.equal(r.realMoneyAllowed,false);
assert.equal(r.reason,'LEGACY_SPORTING_LEGENDS_GREEN_ROUTE_RETIRED_RESEARCH_ONLY');
assert.equal(r.validatedDryRunCycles[0].outcome,'SUCCESS');
assert.equal(r.empiricalRaceBound.executionAssumptionsClosed,true);
assert.equal(r.guards.legacyGreenCannotPropagate,true);

const selfReview={type:'GITHUB_REVIEWED_PROSPECTIVE_RACE_LEDGER',reviewCommitSha:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',protocolId:'p1',cycleIds:['cycle-1']};
r=evaluateSportingLegendsOverdueGreenRoute({...closed,independentRaceLedgerReview:selfReview});
assert.equal(r.decision,'NO_PLAY');
assert.equal(r.realMoneyAllowed,false);
assert.equal(r.reason,'LEGACY_SPORTING_LEGENDS_GREEN_ROUTE_RETIRED_RESEARCH_ONLY');
assert.equal(r.dryRunSummary.independentRaceLedgerReviewSupplied,true);
assert.equal(r.maxSpins,0);

// Even adversarial high RTP input cannot turn the retired compatibility route into execution authority.
const injected=evaluateSportingLegendsOverdueGreenRoute({...closed,stakeEUR:100,conservativeBaseRtpPct:100,independentRaceLedgerReview:selfReview});
assert.equal(injected.version,'sporting-legends-overdue-green-route-v1.4-retired-research-only');
assert.equal(injected.decision,'NO_PLAY');
assert.equal(injected.realMoneyAllowed,false);
assert.equal(injected.realStakeEUR,0);
assert.equal(injected.maxSpins,0);
assert.equal(injected.guards.legacyGreenCannotPropagate,true);

r=evaluateSportingLegendsOverdueGreenRoute({...closed,measuredActionLatencySeconds:2.1});
assert.equal(r.decision,'NO_PLAY');
assert.equal(r.reason,'MEASURED_LATENCY_EXCEEDS_FROZEN_CEILING');
assert.equal(r.realMoneyAllowed,false);

r=evaluateSportingLegendsOverdueGreenRoute({...closed,exactBetfairSpainTickerImsBindingVerified:false});
assert.equal(r.decision,'NO_PLAY');
assert.equal(r.reason,'INVALID_DRY_RUN_CYCLE');
assert.equal(r.realMoneyAllowed,false);

console.log('sporting-legends-overdue-green-route-v1.test.mjs: PASS');
