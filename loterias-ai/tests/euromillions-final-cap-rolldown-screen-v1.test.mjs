import assert from 'node:assert/strict';
import {screenEuroMillionsFinalCapRolldown,getEuroMillionsFinalCapOfficialConstants} from '../lotteries/euromillions-final-cap-rolldown-screen-v1.mjs';

const c=getEuroMillionsFinalCapOfficialConstants();
assert.equal(c.capEUR,250_000_000);
assert.equal(c.euroMillionsBasePriceEUR,2.20);
assert.equal(c.spanishTotalEntryCostEUR,2.50);

const empty=screenEuroMillionsFinalCapRolldown();
assert.equal(empty.researchPositive,false);
assert.equal(empty.usableForExecution,false);
assert.equal(empty.execution.decision,'NO_PLAY');
assert.equal(empty.execution.realMoneyAllowed,false);
assert.equal(empty.economics.aggregateBreakEvenEuropeanBaseRevenueEUR,176_000_000);
assert.ok(empty.blockers.includes('EXACT_FIFTH_CAP_DRAW_NOT_VERIFIED'));
assert.ok(empty.blockers.includes('INDIVIDUAL_TICKET_SHARE_DILUTION_LOWER_BOUND_NOT_VERIFIED'));

const aggregateOnly=screenEuroMillionsFinalCapRolldown({
  exactFifthCapDrawVerified:true,
  exact250mCapVerified:true,
  prospectiveEuropeanBaseRevenueUpperBoundVerified:true,
  europeanBaseRevenueUpperBoundEUR:146_248_086.60,
  taxModelReviewed:true,
});
assert.equal(aggregateOnly.researchPositive,false,'aggregate pot/N benchmark must not self-promote without an individual share-dilution lower bound');
assert.ok(Math.abs(aggregateOnly.economics.aggregateAverageNetCapPotReturnPerEntryEUR-3.008586370113919)<1e-12);
assert.equal(aggregateOnly.economics.individualNetCapPotReturnLowerBoundEUR,null);

const conservativeShare=screenEuroMillionsFinalCapRolldown({
  exactFifthCapDrawVerified:true,
  exact250mCapVerified:true,
  prospectiveEuropeanBaseRevenueUpperBoundVerified:true,
  europeanBaseRevenueUpperBoundEUR:120_000_000,
  individualTicketShareFactorLowerBoundVerified:true,
  individualTicketShareFactorLowerBound:0.90,
  taxModelReviewed:true,
});
assert.equal(conservativeShare.researchPositive,true);
assert.ok(conservativeShare.economics.individualPotOnlyEdgeLowerBoundEUR>0);
assert.equal(conservativeShare.usableForExecution,false,'research-positive must still never authorize a ticket purchase');
assert.equal(conservativeShare.execution.decision,'NO_PLAY');

const tooMuchSales=screenEuroMillionsFinalCapRolldown({
  exactFifthCapDrawVerified:true,
  exact250mCapVerified:true,
  prospectiveEuropeanBaseRevenueUpperBoundVerified:true,
  europeanBaseRevenueUpperBoundEUR:176_000_000,
  individualTicketShareFactorLowerBoundVerified:true,
  individualTicketShareFactorLowerBound:1,
  taxModelReviewed:true,
});
assert.equal(tooMuchSales.researchPositive,false,'strictly positive pot-only lower bound is required');
assert.ok(tooMuchSales.blockers.includes('POT_ONLY_INDIVIDUAL_EV_LOWER_BOUND_NOT_POSITIVE'));
assert.equal(tooMuchSales.execution.realMoneyAllowed,false);

console.log('euromillions-final-cap-rolldown-screen-v1.test.mjs PASS');
