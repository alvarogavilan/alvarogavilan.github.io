import assert from 'node:assert/strict';
import {runPracticeExperiment} from '../edge-backend/src/edge-practice-command-center-v1.mjs';
const fair=[];for(let i=0;i<1200;i++)fair.push({number:i%37});
const snaps=[];let a=50,b=500;for(let i=0;i<20;i++){snaps.push({tsMs:i*1000,tiers:{power:a,extra:b}});a+=1;b+=2;if(i&&i%5===0)a=50;}
const holdout=[];for(let i=0;i<500;i++)holdout.push({number:i%2===0?17:i%37,tsMs:2000+i,tableId:'t1',wheelId:'w1'});
const out=runPracticeExperiment({target:'SYNTHETIC LAB',scenarios:[
 {id:'m',type:'AMOUNT_BOUNDARY_MHB',input:{provenance:'SYNTHETIC',currentAmountEUR:999,guaranteedHitAmountEUR:1000,qualifyingStakeEUR:1,baseRtpPct:95,meterContributionPct:1,jackpotAwardFloorEUR:999,captureProbability:1,rtpAccountingVerifiedBaseExcludingJackpot:true}},
 {id:'p',type:'ROULETTE_PHYSICS_WINDOW',input:{ballReleaseMs:1000,betCloseMs:900}},
 {id:'r',type:'ROULETTE_SPIN_SERIES',records:fair,options:{minSpins:1000}},
 {id:'n',type:'PROGRESSIVE_NETWORK',snapshots:snaps,options:{contributionRatePct:1,contributionRateScope:'ALL_VISIBLE_TIERS_COMBINED',baseRtpExcludingJackpotPct:95,baseRtpExcludingJackpotVerified:false}},
 {id:'h',type:'ROULETTE_PROSPECTIVE_HOLDOUT',candidate:{id:'c1',tableId:'t1',wheelId:'w1',numbers:[17],frozenAtMs:1000,sourceVerdict:'REPRODUCIBLE_BIAS_RESEARCH_CANDIDATE'},holdout,options:{minimumHoldoutSpins:500}}
]});
assert.equal(out.scenarioCount,5);assert.equal(out.highestPriority.id,'h');assert.equal(out.execution.realMoneyAllowed,false);assert.equal(out.ranked.every(x=>x.result.execution.realMoneyAllowed===false),true);console.log('edge-practice-command-center-v1.test.mjs: PASS');
