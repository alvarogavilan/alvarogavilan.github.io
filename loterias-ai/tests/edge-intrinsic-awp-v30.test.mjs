import assert from 'node:assert/strict';
import fs from 'node:fs';
import { INTRINSIC_EDGE_CURRENT,screenGoldenWheelsState,intrinsicEdgeRanking } from '../edge-backend/src/intrinsic-edge-screen-v1.mjs';

const worker=fs.readFileSync('loterias-ai/edge-backend/src/index-v30.mjs','utf8');
const wrangler=fs.readFileSync('loterias-ai/edge-backend/wrangler.jsonc','utf8');
const contract=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/client-execution-contract-v1.json','utf8'));

assert.equal(INTRINSIC_EDGE_CURRENT.policy.promotionsExcluded,true);
assert.equal(INTRINSIC_EDGE_CURRENT.policy.onlyIntrinsicGameOrMachineState,true);
const g=INTRINSIC_EDGE_CURRENT.goldenWheels;
assert.equal(g.currentProduct,true);
assert.equal(g.nationwideHomologationReported,true);
assert.equal(g.visibleBonusCounterVerified,true);
assert.equal(g.bonusCounterSeparateFromReserveAwardsCredits,true);
assert.equal(g.maximumBonusCounter,200);
assert.equal(g.upperGameRequiresPositiveBonusCountAndCredits,true);
assert.equal(g.upperGameConsumesCreditsAndBonuses,true);
assert.equal(g.cashButtonExplicitlyClearsBonusCounter,false);
assert.equal(g.bonusPersistenceAcrossPlayerChangeVerified,false);
assert.equal(g.exactConditionalUpperGameEvResolved,false);
assert.equal(g.positiveEvProven,false);
assert.equal(g.realMoneyAllowed,false);

const unknown=screenGoldenWheelsState();
assert.equal(unknown.positiveEvProven,false);
assert.equal(unknown.executable,false);
assert.ok(unknown.blockers.includes('VISIBLE_BONUS_COUNT_NOT_CAPTURED'));
assert.ok(unknown.blockers.includes('BONUS_PERSISTENCE_ACROSS_CASHOUT_AND_PLAYER_CHANGE_UNVERIFIED'));
assert.ok(unknown.blockers.includes('EXACT_CONDITIONAL_UPPER_GAME_EV_UNRESOLVED'));

const observed=screenGoldenWheelsState({bonusCount:33});
assert.equal(observed.stateObserved,true);
assert.equal(observed.positiveEvProven,false);
assert.equal(observed.realMoneyAllowed,false);

const hypothetical=screenGoldenWheelsState({bonusCount:33,persistenceVerified:true,conditionalUpperGameEvPerCashEUR:1.05});
assert.equal(hypothetical.positiveEvProven,true);
assert.equal(hypothetical.executable,false);
assert.equal(hypothetical.realMoneyAllowed,false);
assert.ok(hypothetical.blockers.includes('CURRENT_MACHINE_RULES_FINGERPRINT_REQUIRED'));
assert.ok(hypothetical.blockers.includes('PROSPECTIVE_FIELD_VALIDATION_REQUIRED'));

const ranking=intrinsicEdgeRanking();
assert.equal(ranking[0].id,'rfranco-golden-wheels');
assert.equal(ranking[1].id,'botemania-jackpot-king');
assert.equal(ranking[2].id,'igt-ultimate-x');
assert.ok(ranking.every(x=>x.realMoneyAllowed===false));
assert.equal(JSON.stringify(ranking).toLowerCase().includes('playuzu'),false);
assert.equal(JSON.stringify(ranking).toLowerCase().includes('promotion'),false);

assert.match(wrangler,/"main"\s*:\s*"src\/index-v30\.mjs"/);
assert.ok(worker.includes("import { EdgeSentinel as V29EdgeSentinel } from './index-v29.mjs'"));
assert.ok(worker.includes('edge-sentinel-v30-intrinsic-awp-state-20260824a'));
assert.ok(worker.includes("path==='/science/intrinsic-edge'||path==='/science/awp-persistent-state'"));
assert.ok(worker.includes('promotionsExcludedFromIntrinsicRanking:true'));

assert.equal(contract.enabled,false);
assert.equal(contract.realMoneyAllowed,false);
assert.equal(contract.scientificGatePassed,false);
for(const value of Object.values(contract.verification))assert.equal(value,false);

console.log('edge-intrinsic-awp-v30.test.mjs: PASS');
