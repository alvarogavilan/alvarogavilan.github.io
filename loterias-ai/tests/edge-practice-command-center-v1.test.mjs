import assert from 'node:assert/strict';
import {runPracticeExperiment} from '../edge-backend/src/edge-practice-command-center-v1.mjs';
const fair=[];for(let i=0;i<1200;i++)fair.push({number:i%37});
const snaps=[];let a=50,b=500;for(let i=0;i<20;i++){snaps.push({tsMs:i*1000,tiers:{power:a,extra:b}});a+=1;b+=2;if(i&&i%5===0)a=50;}
const holdout=[];for(let i=0;i<500;i++)holdout.push({number:i%2===0?17:i%37,tsMs:2000+i,tableId:'t1',wheelId:'w1'});
const predictorEntries=[];for(let i=0;i<100;i++)predictorEntries.push({outcome:i%37,predicted:[17,34,6],createdBeforeOutcome:true});
const fullMoon=[{type:'BONUS'},{type:'BONUS'},{type:'MONEY',valueX:5},{type:'MULTIPLIER'},{type:'MONEY',valueX:.5}];
const out=runPracticeExperiment({target:'SYNTHETIC LAB',scenarios:[
 {id:'m',type:'AMOUNT_BOUNDARY_MHB',input:{provenance:'SYNTHETIC',currentAmountEUR:999,guaranteedHitAmountEUR:1000,qualifyingStakeEUR:1,baseRtpPct:95,meterContributionPct:1,jackpotAwardFloorEUR:999,captureProbability:1,rtpAccountingVerifiedBaseExcludingJackpot:true}},
 {id:'t',type:'TIMED_FIRST_CONTRIBUTION',input:{provenance:'SYNTHETIC',qualifyingStakeEUR:1,baseRtpPct:95,jackpotAwardFloorEUR:50,probabilityOurContributionIsFirst:.01,firstContributionGuaranteeVerified:true,rtpAccountingVerifiedBaseExcludingJackpot:true}},
 {id:'s',type:'SLOT_STAKE_LADDER',input:{rtpPct:95,stages:[{stakeEUR:.4,spins:15},{stakeEUR:.6,spins:10},{stakeEUR:1,spins:5}]}},
 {id:'sc',type:'SLOT_STAKE_CHANGE_CLAIM',input:{creatorOrForumOnly:true}},
 {id:'st9',type:'STREAK_OF_LUCK_STATE9_ONE_SPIN',input:{observedStreakState:9,totalStakeEUR:1,jackpotAwardFloorEUR:175,sixtyFreeSpinsValueFloorEUR:0,probabilityJackpotBeforeState9TerminalLoss:.01,bonusDiceSequencingResolved:true}},
 {id:'fmc',type:'FULL_MOON_MOON_COLLECT',input:{totalStakeEUR:1,probabilityAtLeastOneNewQualifyingMoonNextSpin:.05,moons:fullMoon}},
 {id:'fmp',type:'FULL_MOON_MOON_PUSH',input:{totalStakeEUR:1,probabilityNextMoonCompletesMoonPush:.03,moons:fullMoon}},
 {id:'sn',type:'SNAKES_LADDERS_PROGRESS',input:{totalStakeEUR:1,observedActiveSegments:10,probabilityCompletesSnakeNextSpin:.06,exactCurrentOperatorProgressRuleVerified:true,exactCurrentOperatorBonusFloorVerified:true}},
 {id:'p',type:'ROULETTE_PHYSICS_WINDOW',input:{ballReleaseMs:1000,betCloseMs:900}},
 {id:'r',type:'ROULETTE_SPIN_SERIES',records:fair,options:{minSpins:1000}},
 {id:'pc',type:'ROULETTE_PRODUCT_CLASSIFICATION',input:{mode:'RNG',rngOutcome:true}},
 {id:'pl',type:'ROULETTE_PREDICTOR_LOG',entries:predictorEntries},
 {id:'axa',type:'AXA_REPEATED_NUMBER_PROXY',input:{spins:[1,2,1,3,4,5,6,1,7,1,8,9],lookback:6,minRepeat:2,betWindow:3}},
 {id:'rep',type:'ROULETTE_REPETITION_JACKPOT',input:{wheelSize:37,currentStreakLength:2,triggerLength:3,qualifyingStakeEUR:1,baseHouseEdgePct:2.7027027027,jackpotAwardFloorEUR:100,captureProbability:1,exactEligibilityRuleVerified:false,exactPayoutFloorVerified:false,exactQualifyingStakeVerified:false,fairIndependentWheelAssumptionVerified:false}},
 {id:'aog',type:'AOTG_LIVE_ROULETTE_EV',input:{}},
 {id:'q',type:'QUANTUM_AUTO_PHYSICS_EV',input:{predictedPocketCount:5,holdoutHits:20,holdoutRounds:100,nonMultiplierStraightProfitOdds:29,unitStakeEUR:1}},
 {id:'speed',type:'POST_RELEASE_SECTOR_EV',input:{wheelSize:37,predictedPocketCount:5,holdoutHits:20,holdoutRounds:100,straightProfitOdds:35,unitStakeEUR:1}},
 {id:'n',type:'PROGRESSIVE_NETWORK',snapshots:snaps,options:{contributionRatePct:1,contributionRateScope:'ALL_VISIBLE_TIERS_COMBINED',baseRtpExcludingJackpotPct:95,baseRtpExcludingJackpotVerified:false}},
 {id:'h',type:'ROULETTE_PROSPECTIVE_HOLDOUT',candidate:{id:'c1',tableId:'t1',wheelId:'w1',numbers:[17],frozenAtMs:1000,sourceVerdict:'REPRODUCIBLE_BIAS_RESEARCH_CANDIDATE'},holdout,options:{minimumHoldoutSpins:500}}
]});
assert.equal(out.scenarioCount,19);
assert.equal(out.execution.realMoneyAllowed,false);
assert.equal(out.ranked.every(x=>x.result.execution.realMoneyAllowed===false),true);
assert.ok(out.ranked.some(x=>x.id==='s'&&x.result.expectedRoiPct===-5));
assert.ok(out.ranked.some(x=>x.id==='sc'&&x.result.status==='DISCOVERY_ONLY_UNVERIFIED'));
assert.ok(out.ranked.some(x=>x.id==='rep'&&x.result.practiceVerdict==='BLOCKED_UNVERIFIED_EXECUTION_INPUTS'));
assert.ok(out.ranked.some(x=>x.id==='st9'&&x.result.practiceVerdict==='CONSERVATIVE_POSITIVE_STATE9_ONE_SPIN_CANDIDATE'));
assert.ok(out.ranked.some(x=>x.id==='fmc'&&x.result.practiceVerdict==='CONSERVATIVE_POSITIVE_MOON_COLLECT_ONE_SPIN_CANDIDATE'));
assert.ok(out.ranked.some(x=>x.id==='sn'&&x.result.practiceVerdict==='CONSERVATIVE_POSITIVE_SNAKE_COMPLETION_ONE_SPIN_CANDIDATE'));
assert.ok(out.researchCandidateCount>=4);
console.log('edge-practice-command-center-v1.test.mjs: PASS');
