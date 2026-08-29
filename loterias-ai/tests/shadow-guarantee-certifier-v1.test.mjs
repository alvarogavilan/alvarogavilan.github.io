import assert from 'node:assert/strict';
import {certifyFiniteOutcomeStrategy,certifyWorstCaseBound,getGuaranteeCertifierManifest} from '../edge-backend/src/shadow-guarantee-certifier-v1.mjs';

const manifest=getGuaranteeCertifierManifest();
assert.equal(manifest.hardGuards.positiveEvIsNotGuaranteedProfit,true);
assert.equal(manifest.execution.realMoneyAllowed,false);

const unverified=certifyFiniteOutcomeStrategy({outcomes:[{id:'A',net:1}]});
assert.equal(unverified.valid,false);
assert.equal(unverified.guaranteedProfit,false);

const positiveEvButRisk=certifyFiniteOutcomeStrategy({
  id:'positive-ev-risk',
  exactRulesVerified:true,
  exactOutcomeSetVerified:true,
  exactNetPerOutcomeVerified:true,
  outcomes:[{id:'win',net:10,probability:.2},{id:'lose',net:-1,probability:.8}]
});
assert.equal(positiveEvButRisk.valid,true);
assert.equal(positiveEvButRisk.expectedNet,1.2);
assert.equal(positiveEvButRisk.guaranteedProfit,false);
assert.equal(positiveEvButRisk.classification,'POSITIVE_EV_BUT_LOSS_OUTCOMES_EXIST');

const guaranteed=certifyFiniteOutcomeStrategy({
  id:'finite-arbitrage',
  exactRulesVerified:true,
  exactOutcomeSetVerified:true,
  exactNetPerOutcomeVerified:true,
  outcomes:[{id:'a',net:1,probability:.5},{id:'b',net:2,probability:.5}]
});
assert.equal(guaranteed.guaranteedProfit,true);
assert.equal(guaranteed.minimumNet,1);

const raceUnbounded=certifyWorstCaseBound({minimumPossibleReward:100,maximumPossibleCost:1,exactRewardLowerBoundVerified:true,exactCostUpperBoundVerified:true,allOperationalRisksBounded:false});
assert.equal(raceUnbounded.valid,false);
assert.equal(raceUnbounded.guaranteedProfit,false);

console.log('shadow-guarantee-certifier-v1.test.mjs PASS');
