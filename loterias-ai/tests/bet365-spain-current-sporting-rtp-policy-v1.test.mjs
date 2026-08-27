import assert from 'node:assert/strict';
import {getBet365SpainCurrentSportingRtpPolicy} from '../edge-backend/src/bet365-spain-current-sporting-rtp-policy-v1.mjs';

const frank=getBet365SpainCurrentSportingRtpPolicy({gameCode:'gpas_slfbruno_pop'});
assert.equal(frank.valid,true);
assert.equal(frank.title,'Frank Bruno: Sporting Legends');
assert.equal(frank.publishedMinimumBetEUR,0.10);
assert.equal(frank.publishedMaximumBetEUR,100.00);
assert.equal(frank.publishedTheoreticalRtpPct,95.92);
assert.equal(frank.publishedTheoreticalRtpExcludesJackpotAllocationVerified,true);
assert.equal(frank.headlineRtpMayBeUsedAsBaseGameRtp,true);
assert.equal(frank.jackpotEligibilityAtPublishedMinimumBetVerified,false);
assert.equal(frank.servedStakeAtDecisionVerified,false);
assert.equal(frank.followingDayRuleVerified,false);
assert.equal(frank.servedSljp1RuntimeBindingVerified,false);
assert.equal(frank.usableForExecution,false);
assert.equal(frank.execution.decision,'NO_PLAY');
assert.equal(frank.execution.realMoneyAllowed,false);

const bobby=getBet365SpainCurrentSportingRtpPolicy({gameCode:'gpas_bgeorge_pop'});
assert.equal(bobby.valid,true);
assert.equal(bobby.publishedMinimumBetEUR,0.10);
assert.equal(bobby.publishedMaximumBetEUR,25.00);
assert.equal(bobby.publishedTheoreticalRtpPct,96.49);
assert.equal(bobby.publishedTheoreticalRtpExcludesJackpotAllocationVerified,true);

const brian=getBet365SpainCurrentSportingRtpPolicy({gameCode:'gpas_slblara_pop'});
assert.equal(brian.valid,true);
assert.equal(brian.publishedMinimumBetEUR,0.10);
assert.equal(brian.publishedMaximumBetEUR,100.00);
assert.equal(brian.publishedTheoreticalRtpPct,96.07);
assert.equal(brian.publishedTheoreticalRtpExcludesJackpotAllocationVerified,true);

const unsupported=getBet365SpainCurrentSportingRtpPolicy({gameCode:'unknown'});
assert.equal(unsupported.valid,false);
assert.equal(unsupported.reason,'UNSUPPORTED_SPORTING_GAME_CODE');
assert.equal(unsupported.headlineRtpMayBeUsedAsBaseGameRtp,false);
assert.equal(unsupported.execution.realMoneyAllowed,false);

console.log('bet365-spain-current-sporting-rtp-policy-v1.test.mjs: PASS');
