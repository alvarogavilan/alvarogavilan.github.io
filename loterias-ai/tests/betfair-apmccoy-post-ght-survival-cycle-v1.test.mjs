import assert from 'node:assert/strict';
import {validateBetfairApMcCoyPostGhtSurvivalCycle} from '../casino/jackpots/betfair-apmccoy-post-ght-survival-cycle-v1.mjs';

const CASINO='bf_es';
const TICKER='https://tickers.playtech.example/new_jackpotxml.php';
const launcher=(ts)=>({startedDateTime:new Date(ts*1000).toISOString(),request:{method:'GET',url:'https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=ap-mccoy-sporting-legends-cptn&launchProduct=casino&mode=real&returnURL=https%3A%2F%2Fcasino.betfair.es%2Fjuego%2Fap-mccoy-sporting-legends-cptn',headers:[]},response:{status:200,headers:[],content:{text:''}}});
const config=(ts,casino=CASINO,ticker=TICKER)=>({startedDateTime:new Date(ts*1000).toISOString(),request:{method:'GET',url:'https://launcher.betfair.es/initialResources/es_ES_desktop',headers:[]},response:{status:200,headers:[],content:{mimeType:'application/json',text:JSON.stringify({jackpotsCasino:casino,jackpotsCasinoUrl:ticker})}}});
const ticker=(ts,{ght,amount,winCount=42,casino=CASINO,exec=10}={})=>({startedDateTime:new Date(ts*1000).toISOString(),request:{method:'GET',url:`${TICKER}?casino=${casino}&currency=EUR&game=sljp-1&local=0&winc=0`,headers:[]},response:{status:200,headers:[],content:{mimeType:'text/xml',text:`<request casino="${casino}" currency="eur" game="sljp-1" startTimestamp="${ts-exec}" execInterval="${exec}"/><gamedata game="sljp-1" gamegroup="sljp" local="0" timestamp="${ts}" winc="${winCount}"><amount currency="EUR" guaranteedHitTime="${ght}" step="0.01" wins="1000">${amount}</amount></gamedata>`}}});
const har=(ts,state)=>({log:{entries:[launcher(ts-2),config(ts-1,state?.casino||CASINO,state?.configuredTicker||TICKER),ticker(ts,state)]}});
const wrap=(ts,state,name)=>({har:har(ts,state),sourceName:name});

const ght=1787811300;
const before=wrap(ght-5,{ght,amount:100,winCount:42},'before.har');
const posts=[];
for(let i=0;i<=6;i++){
  const ts=ght+5+i*20;
  posts.push(wrap(ts,{ght,amount:100.01+i*0.01,winCount:42},`post-${i}.har`));
}
let r=validateBetfairApMcCoyPostGhtSurvivalCycle({cycleId:'ght-1787811300',before,postGht:posts});
assert.equal(r.version,'betfair-apmccoy-post-ght-survival-cycle-v1');
assert.equal(r.valid,true);
assert.equal(r.prospectiveSurvivalCandidate,true);
assert.equal(r.completeObservationHorizon,true);
assert.equal(r.rightCensored,true);
assert.equal(r.requestExecIntervalSeconds,10);
assert.equal(r.horizonIntervals,12);
assert.equal(r.horizonSeconds,120);
assert.equal(r.detectionLagSeconds,5);
assert.equal(r.survivalLowerBoundSeconds,120);
assert.equal(r.latencyThresholdSelectedAtCollectionTime,false);
assert.equal(r.completeAttemptLedgerVerified,false);
assert.equal(r.usableForLatencyClassification,false);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.bindingScope.expectedBetfairImsCasino,CASINO);
assert.equal(r.bindingScope.tickerEndpoint,TICKER);

const terminalPosts=[
  wrap(ght+5,{ght,amount:100.01,winCount:42},'terminal-post-0.har'),
  wrap(ght+15,{ght,amount:100.02,winCount:42},'terminal-post-1.har'),
  wrap(ght+25,{ght:ght+86400,amount:50,winCount:43},'terminal-post-2.har'),
];
r=validateBetfairApMcCoyPostGhtSurvivalCycle({cycleId:'terminal-cycle',before:wrap(ght-5,{ght,amount:100,winCount:42},'terminal-before.har'),postGht:terminalPosts});
assert.equal(r.valid,true);
assert.equal(r.rightCensored,false);
assert.equal(r.completeObservationHorizon,true);
assert.equal(r.firstObservedAwardOrResetTimestamp,ght+25);
assert.deepEqual(r.awardResetInterval,{lowerExclusiveTimestamp:ght+15,upperInclusiveTimestamp:ght+25});
assert.equal(r.reason,'COMPLETE_INTERVAL_CENSORED_POST_GHT_AWARD_RESET_CANDIDATE');

const stoppedEarly=validateBetfairApMcCoyPostGhtSurvivalCycle({cycleId:'short',before,postGht:posts.slice(0,2)});
assert.equal(stoppedEarly.valid,false);
assert.equal(stoppedEarly.reason,'OBSERVATION_STOPPED_BEFORE_FROZEN_HORIZON');
assert.equal(stoppedEarly.execution.realMoneyAllowed,false);

const changedCasinoPosts=[posts[0],wrap(ght+25,{ght,amount:100.02,winCount:42,casino:'other_es'},'changed-casino.har')];
const changedCasino=validateBetfairApMcCoyPostGhtSurvivalCycle({cycleId:'changed-casino',before,postGht:changedCasinoPosts});
assert.equal(changedCasino.valid,false);
assert.ok(['EXACT_AP_MCCOY_SERVED_BINDING_CHANGED_DURING_CYCLE','POST_CAPTURE_REJECTED'].includes(changedCasino.reason));
assert.equal(changedCasino.execution.realMoneyAllowed,false);

const duplicateNames=validateBetfairApMcCoyPostGhtSurvivalCycle({cycleId:'dupe',before:{...before,sourceName:'same.har'},postGht:[{...posts[0],sourceName:'same.har'},posts[1]]});
assert.equal(duplicateNames.valid,false);
assert.equal(duplicateNames.reason,'SOURCE_NAMES_MUST_BE_UNIQUE');

const preFreezeGht=1787811000;
const preFreeze=validateBetfairApMcCoyPostGhtSurvivalCycle({
  cycleId:'pre-freeze',
  before:wrap(preFreezeGht-5,{ght:preFreezeGht,amount:90,winCount:10},'pre-before.har'),
  postGht:[wrap(preFreezeGht+5,{ght:preFreezeGht,amount:90.01,winCount:10},'pre-post-0.har'),wrap(preFreezeGht+15,{ght:preFreezeGht+86400,amount:50,winCount:11},'pre-post-1.har')],
});
assert.equal(preFreeze.valid,false);
assert.equal(preFreeze.reason,'BEFORE_CAPTURE_REJECTED');
assert.equal(preFreeze.captureReason,'CAPTURE_NOT_STRICTLY_POST_FREEZE');
assert.equal(preFreeze.execution.realMoneyAllowed,false);

console.log('betfair-apmccoy-post-ght-survival-cycle-v1.test.mjs: PASS');
