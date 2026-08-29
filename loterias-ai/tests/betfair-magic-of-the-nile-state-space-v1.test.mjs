import assert from 'node:assert/strict';
import {enumerateMagicOfTheNilePreTriggerStates,classifyMagicOfTheNileState,assessMagicOfTheNileExactEvInputs} from '../edge-backend/src/betfair-magic-of-the-nile-state-space-v1.mjs';

const states=enumerateMagicOfTheNilePreTriggerStates();
assert.equal(states.length,27);
assert.equal(new Set(states.map(x=>x.stateKey)).size,27);
assert.ok(states.every(x=>x.execution.decision==='NO_PLAY'&&x.execution.realMoneyAllowed===false));

const best=classifyMagicOfTheNileState({red:2,blue:2,green:2});
assert.equal(best.valid,true);
assert.equal(best.totalGems,6);
assert.equal(best.discoveryClass,'STRONG_DISCOVERY_PRIOR');
assert.equal(best.exactSpainPositiveEvVerified,false);

const five=classifyMagicOfTheNileState({red:2,blue:2,green:1});
assert.equal(five.discoveryClass,'STRONG_DISCOVERY_PRIOR');
const fourPairs=classifyMagicOfTheNileState({red:2,blue:2,green:0});
assert.equal(fourPairs.discoveryClass,'BORDERLINE_STRONGER_TWO_PAIRS_PRIOR');
const four211=classifyMagicOfTheNileState({red:2,blue:1,green:1});
assert.equal(four211.discoveryClass,'BORDERLINE_CONFIGURATION_DEPENDENT_PRIOR');
const low=classifyMagicOfTheNileState({red:1,blue:1,green:1});
assert.equal(low.discoveryClass,'GENERALLY_AVOID_PUBLIC_PRIOR');

const incomplete=assessMagicOfTheNileExactEvInputs({gameId:'magic-of-nile-aig',exactSpainTheoreticalRtpVerified:true,theoreticalRtpPct:96.02,exactServedBetLevelVerified:true,totalBetEUR:0.75,exactCurrentGemVectorVerified:true,gemVector:{red:2,blue:2,green:2}});
assert.equal(incomplete.readyForExactConditionalEvComputation,false);
assert.ok(incomplete.missing.includes('exactSpainGemAwardProbabilitiesVerified'));
assert.ok(incomplete.missing.includes('exactSpainFeatureReturnDistributionsVerified'));
assert.equal(incomplete.execution.realMoneyAllowed,false);

const completeResearchInputs=assessMagicOfTheNileExactEvInputs({gameId:'magic-of-nile-aig',exactSpainTheoreticalRtpVerified:true,theoreticalRtpPct:96.02,exactServedBetLevelVerified:true,totalBetEUR:0.75,exactCurrentGemVectorVerified:true,gemVector:{red:2,blue:2,green:2},exactSpainGemAwardProbabilitiesVerified:true,exactSpainFeatureReturnDistributionsVerified:true,exactSpainBaseAndBonusTransitionModelVerified:true});
assert.equal(completeResearchInputs.readyForExactConditionalEvComputation,true);
assert.equal(completeResearchInputs.execution.decision,'NO_PLAY');

console.log('betfair-magic-of-the-nile-state-space-v1.test.mjs PASS');
