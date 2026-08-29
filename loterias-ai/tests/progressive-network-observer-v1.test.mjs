import assert from 'node:assert/strict';
import {analyzeProgressiveNetworkSnapshots as analyze} from '../edge-backend/src/progressive-network-observer-v1.mjs';
const snaps=[]; let p=50,e=500,s=5000,u=100000; for(let i=0;i<51;i++){snaps.push({tsMs:i*1000,tiers:{power:p,extra:e,super:s,ultimate:u}});p+=1;e+=2;s+=3;u+=4;if(i>0&&i%5===0)p=50;if(i>0&&i%10===0)e=500;}
let r=analyze(snaps,{contributionRatePct:1,contributionRateScope:'ALL_VISIBLE_TIERS_COMBINED',seedsByTier:{power:50,extra:500,super:5000,ultimate:100000},baseRtpExcludingJackpotPct:97,baseRtpExcludingJackpotVerified:true,minimumObservedHitsPerNetwork:1});
assert.equal(r.ok,true);assert.ok(r.estimatedNetworkCoinInEUR>0);assert.ok(r.observedHitCount>0);assert.equal(r.execution.realMoneyAllowed,false);assert.ok(['CONSERVATIVE_POSITIVE_RTP_PRACTICE_CANDIDATE','NO_CONSERVATIVE_POSITIVE_RTP_SIGNAL'].includes(r.practiceVerdict));
r=analyze(snaps,{contributionRatePct:1,contributionRateScope:'ALL_VISIBLE_TIERS_COMBINED',baseRtpExcludingJackpotPct:97,baseRtpExcludingJackpotVerified:false});
assert.equal(r.practiceVerdict,'BLOCKED_BASE_RTP_ACCOUNTING');
r=analyze(snaps,{contributionRatePct:1,contributionRateScope:'PER_TIER'});assert.equal(r.ok,false);assert.equal(r.reason,'CONTRIBUTION_RATE_SCOPE_MUST_BE_ALL_VISIBLE_TIERS_COMBINED');
console.log('progressive-network-observer-v1.test.mjs: PASS');
