import assert from 'node:assert/strict';
import {classifyOceanMagicVisibleNextSpinState} from '../casino/stateful/ocean-magic-visible-state-classifier-v1.mjs';

const wildYes=classifyOceanMagicVisibleNextSpinState({mode:'Wild Bubble',bubbles:[{reel:1,row:1}]});
assert.equal(wildYes.valid,true);
assert.equal(wildYes.externalStrategy.publishedStrategyPlayCandidate,true);
assert.equal(wildYes.bet365SpainGate.executionEligible,false);
assert.equal(wildYes.bet365SpainGate.reason,'BET365_9670_BUILD_NOT_FINGERPRINTED');

const wildNo=classifyOceanMagicVisibleNextSpinState({mode:'Wild Bubble',bubbles:[{reel:5,row:2}]});
assert.equal(wildNo.externalStrategy.publishedStrategyPlayCandidate,false);

const r4Exception=classifyOceanMagicVisibleNextSpinState({mode:'Wild Bubble',bubbles:[{reel:4,row:1},{reel:4,row:4}]});
assert.equal(r4Exception.externalStrategy.exceptionOnlyReel4Rows1And4,true);
assert.equal(r4Exception.externalStrategy.publishedStrategyPlayCandidate,false);

const twoMaybes=classifyOceanMagicVisibleNextSpinState({mode:'Bubble Burst',bubbles:[{reel:1,row:1},{reel:2,row:4}]});
assert.equal(twoMaybes.externalStrategy.publishedStrategyPlayCandidate,true);

const burstYes=classifyOceanMagicVisibleNextSpinState({mode:'Bubble Boost',bubbles:[{reel:3,row:1}]});
assert.equal(burstYes.externalStrategy.publishedStrategyPlayCandidate,true);
assert.equal(burstYes.bubbles[0].label,'YES');

const syntheticNumericPass=classifyOceanMagicVisibleNextSpinState({mode:'Wild Bubble',bubbles:[{reel:2,row:2}],exactBet365BuildFingerprintVerified:true,conditionalEvLowerBound:1.01});
assert.equal(syntheticNumericPass.bet365SpainGate.executionEligible,true);
assert.equal(syntheticNumericPass.execution.decision,'NO_PLAY');
assert.equal(syntheticNumericPass.execution.realMoneyAllowed,false);

const invalid=classifyOceanMagicVisibleNextSpinState({mode:'Wild Bubble',bubbles:[{reel:6,row:1}]});
assert.equal(invalid.valid,false);

console.log('ocean-magic-visible-state-classifier-v1.test.mjs: PASS');
