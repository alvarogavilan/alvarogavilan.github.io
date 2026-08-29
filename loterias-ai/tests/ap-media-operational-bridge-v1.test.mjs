import assert from 'node:assert/strict';
import {getAbsorbedMediaOperationalIndex,evaluateMinotaurRisingResearch,evaluateEuroMillionsFinalCapResearch} from '../edge-backend/src/ap-media-operational-bridge-v1.mjs';

const idx=getAbsorbedMediaOperationalIndex();
assert.equal(idx.execution.decision,'NO_PLAY');
assert.equal(idx.execution.realMoneyAllowed,false);
assert.equal(idx.hardGuards.mediaIsDiscoveryAndMechanicEvidenceOnly,true);
assert.equal(idx.targets.ENRACHA_OCEAN_MAGIC.mediaCanSetSpanishState,false);
assert.equal(idx.targets.SPAIN_MINOTAUR_RISING_MHB.mediaCanSetSpanishBoundaries,false);
assert.equal(idx.targets.EUROMILLIONS_FINAL_CAP_ROLLDOWN.currentOpportunity,false);

const minotaurBlocked=evaluateMinotaurRisingResearch({otherMarketBoundariesUsed:true,meterClosenessUsedAsPositiveEvProof:true,uniformTriggerAssumed:true});
assert.equal(minotaurBlocked.admittedForExactEvResearch,false);
assert.ok(minotaurBlocked.missing.includes('exactSpanishOperatorBuildVerified'));
assert.ok(minotaurBlocked.warnings.includes('OTHER_MARKET_MHB_BOUNDARIES_CANNOT_POPULATE_SPAIN'));
assert.ok(minotaurBlocked.warnings.includes('METER_CLOSENESS_ALONE_IS_NOT_POSITIVE_EV'));
assert.ok(minotaurBlocked.warnings.includes('UNIFORM_TRIGGER_CANNOT_BE_ASSUMED'));
assert.equal(minotaurBlocked.execution.realMoneyAllowed,false);

const minotaurResearch=evaluateMinotaurRisingResearch({exactSpanishOperatorBuildVerified:true,exactFiveMhbBoundariesVerified:true,currentFiveMetersPreWagerVerified:true,qualifyingStakeVerified:true,baseRtpJackpotAccountingVerified:true,conservativeWorstCaseCostBoundVerified:true});
assert.equal(minotaurResearch.admittedForExactEvResearch,true);
assert.equal(minotaurResearch.execution.decision,'NO_PLAY');

const euroBlocked=evaluateEuroMillionsFinalCapResearch({currentOpportunity:true,exactFifthConsecutiveCapDrawVerified:false,capExactly250mVerified:true});
assert.equal(euroBlocked.currentOpportunity,false);
assert.equal(euroBlocked.researchReviewComplete,false);
assert.equal(euroBlocked.historicalSalesCanAuthorizeFutureTicket,false);
assert.equal(euroBlocked.numberPatternPredictionRelevant,false);
assert.equal(euroBlocked.execution.realMoneyAllowed,false);

const euroReviewed=evaluateEuroMillionsFinalCapResearch({currentOpportunity:true,exactFifthConsecutiveCapDrawVerified:true,capExactly250mVerified:true,prospectiveEuropeanBaseRevenueUpperBoundVerified:true,individualTicketShareDilutionLowerBoundVerified:true,numberSelectionPolicyFrozenPrePurchase:true,taxModelReviewed:true,finalPerEntryNetEvLowerBoundPositive:true});
assert.equal(euroReviewed.currentOpportunity,true);
assert.equal(euroReviewed.researchReviewComplete,true);
assert.equal(euroReviewed.execution.decision,'NO_PLAY');

console.log('ap-media-operational-bridge-v1.test.mjs: PASS');
