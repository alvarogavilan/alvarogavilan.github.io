import assert from 'node:assert/strict';
import {analyzeSafeHarPairText} from '../scripts/analyze-betfair-sporting-har-pair.mjs';

const launcher=()=>({request:{method:'GET',url:'https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=ap-mccoy-sporting-legends-cptn&launchProduct=casino&mode=real&returnURL=https%3A%2F%2Fcasino.betfair.es%2Fjuego%2Fap-mccoy-sporting-legends-cptn&switchedToPopup=true',headers:[]},response:{status:200,headers:[],content:{text:'launcher'}}});
const config=(casino='bf_es',cacheBust='',extra={})=>({request:{method:'GET',url:`https://launcher.betfair.es/initialResources/es_ES_desktop${cacheBust?`?cacheBust=${cacheBust}`:''}`,headers:[{name:'Authorization',value:'Bearer secret-token'}]},response:{status:200,headers:[{name:'Set-Cookie',value:'sid=cookievalue'}],content:{mimeType:'application/json',text:JSON.stringify({jackpotsCasino:casino,jackpotsCasinoUrl:'https://tickers.playtech.example/new_jackpotxml.php?configured=secret',...extra})}}});
const ticker=(gameTimestamp,amount,winCount=42,casino='bf_es',ght=2000)=>({startedDateTime:new Date(gameTimestamp*1000).toISOString(),request:{method:'GET',url:`https://tickers.playtech.example/new_jackpotxml.php?casino=${casino}&currency=EUR&game=sljp-1&local=0&winc=0&token=hidden`,headers:[]},response:{status:200,headers:[],content:{mimeType:'text/xml',text:`<request casino="${casino}" currency="eur" game="sljp-1" startTimestamp="${gameTimestamp-10}" execInterval="10"/><gamedata game="sljp-1" gamegroup="sljp" local="0" timestamp="${gameTimestamp}" winc="${winCount}"><amount currency="EUR" guaranteedHitTime="${ght}" step="0.01" wins="1000">${amount}</amount></gamedata>`}}});
const har=(gameTimestamp,amount,winCount=42,casino='bf_es',ght=2000,cacheBust='',extra={})=>JSON.stringify({log:{entries:[launcher(),config(casino,cacheBust,extra),ticker(gameTimestamp,amount,winCount,casino,ght)]}});
const genericHar=(gameTimestamp,amount)=>JSON.stringify({log:{entries:[config(),ticker(gameTimestamp,amount)]}});

const r=analyzeSafeHarPairText(har(1990,100,42,'bf_es',2000,'before'),har(2005,100.02,42,'bf_es',2000,'after'),{beforeSourceName:'before.har',afterSourceName:'after.har',decisionNowEpochSeconds:2010,stakeEUR:0.25,stakeReviewCommit:'a'.repeat(40)});
assert.equal(r.ok,true);
assert.equal(r.version,'betfair-sporting-safe-har-pair-cli-v1.3-research-only-bridge');
assert.equal(r.analysis.pairVerified,true);
assert.equal(r.analysis.researchOnlyBridge,true);
assert.equal(r.analysis.underlyingDecision,'NO_PLAY');
assert.equal(r.analysis.codeOwnedSemantics.operatorFollowingDayRuleVerified,true);
assert.equal(r.analysis.codeOwnedSemantics.providerGhtBoundarySemanticsVerified,true);
assert.equal(r.analysis.codeOwnedSemantics.conservativeMainGameRtpPct,93.03);
assert.equal(r.analysis.overdue.followingDayUnawardedVerified,true);
assert.equal(r.analysis.overdue.nextEligibleNetworkBetGuaranteedJackpot,true);
assert.equal(r.analysis.overdue.currentDailyJackpotEUR,100.02);
assert.equal(r.analysis.overdue.currentDailyAmountExactVerifiedFromValidatedServerSnapshot,true);
assert.equal(r.analysis.raceGate.requestedStakeEUR,0.25);
assert.equal(r.analysis.raceGate.reviewedStakeEUR,null);
assert.equal(r.analysis.raceGate.stakeAtDecisionExactVerified,false);
assert.equal(r.analysis.stakeReview.valid,false);
assert.equal(r.analysis.stakeReview.reason,'EXPLICIT_TOTAL_STAKE_MENU_CANDIDATE_REQUIRED');
assert.equal(r.analysis.raceGate.structuredProspectiveRaceEvidenceVerified,false);
assert.equal(r.analysis.before.configSourceUrl,'https://launcher.betfair.es/initialResources/es_ES_desktop');
assert.equal(r.analysis.before.tickerEndpoint,'https://tickers.playtech.example/new_jackpotxml.php');
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.hardGuards.operatorSemanticsComeFromCodeOwnedEvidenceAnchors,true);
assert.equal(r.hardGuards.stakeRequiresExactCodeOwnedIndependentReviewArtifact,true);
assert.equal(r.hardGuards.researchOnlyBridgeRequired,true);
assert.equal(r.hardGuards.underlyingLegacyGreenCannotPropagate,true);
assert.equal(r.hardGuards.callerRuleAndStakeVerificationBooleansNotAccepted,true);
const serialized=JSON.stringify(r);
for(const secret of ['secret-token','cookievalue','configured=secret','token=hidden','cacheBust=before','returnURL='])assert.equal(serialized.includes(secret),false);

const withMenu=analyzeSafeHarPairText(har(1990,100,42,'bf_es',2000,'before'),har(2005,100.02,42,'bf_es',2000,'after',{availableTotalBets:[0.1,0.25,0.5]}),{decisionNowEpochSeconds:2010,stakeEUR:0.25,stakeReviewCommit:'a'.repeat(40)});
assert.equal(withMenu.ok,true);
assert.equal(withMenu.analysis.researchOnlyBridge,true);
assert.equal(withMenu.analysis.stakeReview.reason,'STAKE_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED');
assert.deepEqual(withMenu.analysis.stakeReview.servedTotalStakeValuesEUR,[0.1,0.25,0.5]);
assert.equal(withMenu.analysis.raceGate.reviewedStakeEUR,null);
assert.equal(withMenu.execution.realMoneyAllowed,false);

const generic=analyzeSafeHarPairText(genericHar(1990,100),genericHar(2005,100.02),{decisionNowEpochSeconds:2010,stakeEUR:0.25});
assert.equal(generic.ok,true);
assert.equal(generic.analysis.pairVerified,false);
assert.equal(generic.analysis.bridgeValid,false);
assert.equal(generic.analysis.bridgeReason,'BEFORE_HAR_SNAPSHOT_INVALID');
assert.equal(generic.analysis.underlyingScientificReason,'BEFORE_HAR_SNAPSHOT_INVALID');
assert.equal(generic.execution.realMoneyAllowed,false);

const reset=analyzeSafeHarPairText(har(1990,100,42),har(2005,90,43),{decisionNowEpochSeconds:2010,stakeEUR:0.25});
assert.equal(reset.ok,true);
assert.equal(reset.analysis.underlyingScientificReason,'JACKPOT_WIN_COUNT_CHANGED');
assert.equal(reset.execution.maxSpins,0);
assert.equal(reset.execution.realMoneyAllowed,false);

const malformed=analyzeSafeHarPairText('{bad',har(2005,100.02),{decisionNowEpochSeconds:2010});
assert.equal(malformed.ok,false);
assert.equal(malformed.reason,'BEFORE_HAR_PARSE_FAILED');
assert.equal(malformed.execution.realMoneyAllowed,false);

console.log('analyze-betfair-sporting-har-pair.test.mjs: PASS');
