import assert from 'node:assert/strict';
import {verifyBet365SportingServedOverduePair} from '../edge-backend/src/bet365-sporting-served-overdue-pair-v1.mjs';

let r=verifyBet365SportingServedOverduePair({});
assert.equal(r.valid,false);
assert.equal(r.reason,'GAME_CODE_REQUIRED');
assert.equal(r.realCrossGhtUnawardedPairVerified,false);
assert.equal(r.servedTenCentTotalStakeVerified,false);
assert.equal(r.operatorFollowingDayRuleAdoptionVerified,false);
assert.equal(r.usableForExecution,false);
assert.equal(r.execution.decision,'NO_PLAY');
assert.equal(r.execution.realMoneyAllowed,false);
assert.equal(r.execution.maxSpins,0);
assert.equal(r.execution.maxTotalStakeEUR,0);

r=verifyBet365SportingServedOverduePair({gameCode:'gpas_slfbruno_pop',requiredStakeEUR:0});
assert.equal(r.valid,false);
assert.equal(r.reason,'INVALID_REQUIRED_STAKE');
assert.equal(r.execution.decision,'NO_PLAY');

r=verifyBet365SportingServedOverduePair({gameCode:'gpas_slfbruno_pop',beforeHar:{log:{entries:[]}},afterHar:{log:{entries:[]}}});
assert.equal(r.valid,false);
assert.equal(r.reason,'BEFORE_SERVED_SLJP1_BINDING_REQUIRED');
assert.equal(r.realCrossGhtUnawardedPairVerified,false);
assert.equal(r.servedTenCentTotalStakeVerified,false);
assert.equal(r.servedTenCentJackpotEligibilityVerified,false);
assert.equal(r.operatorFollowingDayRuleAdoptionVerified,false);
assert.equal(r.usableForRaceEvidence,false);
assert.equal(r.usableForExecution,false);

r=verifyBet365SportingServedOverduePair({gameCode:'gpas_bgeorge_pop',beforeHar:{log:{entries:[]}},afterHar:{log:{entries:[]}}});
assert.equal(r.valid,false);
assert.equal(r.reason,'BEFORE_SERVED_SLJP1_BINDING_REQUIRED');
assert.equal(r.execution.realMoneyAllowed,false);

console.log('bet365-sporting-served-overdue-pair-v1.test.mjs: PASS');
