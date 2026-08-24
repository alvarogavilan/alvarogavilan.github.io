import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SPANISH_JACKPOT_AWARDS,SPANISH_JACKPOT_AGGREGATES,MILLIONAIRE_GENIE_CURRENT_ECONOMICS } from '../edge-backend/src/spanish-jackpot-awards-v1.mjs';
import { parseSpanishEuro,extractJackpotAmountNearLabel } from '../edge-backend/src/888-jackpot-page-parser-v1.mjs';
import { summarizeAwards,conditionalConstantHazardScreen } from '../edge-backend/src/millionaire-genie-historical-screen-v1.mjs';

const close=(a,b,tol=1e-12)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`);
const wrangler=fs.readFileSync('loterias-ai/edge-backend/wrangler.jsonc','utf8');
const worker=fs.readFileSync('loterias-ai/edge-backend/src/index-v19.mjs','utf8');
const loader=fs.readFileSync('loterias-ai/edge-live/edge-live-ux-v1.mjs','utf8');
const ui=fs.readFileSync('loterias-ai/edge-live/edge-spanish-awards-client-v1.mjs','utf8');
const semantics=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/spanish-jackpot-award-archive-semantics-v1.json','utf8'));
const contract=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/client-execution-contract-v1.json','utf8'));

assert.equal(parseSpanishEuro('166.056,12'),166056.12);
assert.equal(parseSpanishEuro('5.295,43'),5295.43);
assert.equal(parseSpanishEuro('12,50'),12.5);
assert.equal(parseSpanishEuro('not-money'),null);
const parsed=extractJackpotAmountNearLabel('<div>Millionaire Genie</div><span>166.056,12 €</span>','Millionaire Genie');
assert.equal(parsed?.amountEUR,166056.12);

const ids=new Set();
for(const e of SPANISH_JACKPOT_AWARDS){
  assert.ok(e.eventId&&!ids.has(e.eventId),'eventId must be unique');ids.add(e.eventId);
  assert.ok(Number(e.amountEUR)>0,'award must be positive');
  assert.ok(/^20\d\d-\d\d-\d\d$/.test(e.periodStart));
  assert.ok(/^20\d\d-\d\d-\d\d$/.test(e.periodEnd));
  assert.ok(e.periodStart<=e.periodEnd,'period must be ordered');
  if(e.datePrecision==='DAY')assert.equal(e.periodStart,e.periodEnd,'DAY precision requires exact same day');
  assert.equal(e.configurationIdentityCurrent,false,'historical award must not claim current config identity');
  assert.equal(e.awardVerifiedPublic,true);
}
assert.ok(SPANISH_JACKPOT_AWARDS.length>=27);
assert.ok(SPANISH_JACKPOT_AGGREGATES.length>=2);
assert.ok(SPANISH_JACKPOT_AGGREGATES.every(x=>x.expandToSyntheticRows===false));

const mg=SPANISH_JACKPOT_AWARDS.filter(x=>x.operator==='888casino-es'&&x.game==='Millionaire Genie');
assert.equal(mg.length,20);
const stats=summarizeAwards(mg.map(x=>x.amountEUR));
assert.deepEqual(stats,{n:20,totalEUR:9715090,meanEUR:485754.5,medianEUR:420092,minEUR:40000,maxEUR:1221429});
const screen=conditionalConstantHazardScreen({awardAmounts:mg.map(x=>x.amountEUR),contributionRates:[0.02,0.035]});
assert.equal(screen.eligible,true);assert.equal(screen.models.length,2);
close(screen.models[0].hazardPerEURConditionalRange[0],4.117306170092094e-8);
close(screen.models[0].hazardPerEURConditionalRange[1],4.486774670810951e-8);
close(screen.models[1].hazardPerEURConditionalRange[0],7.205285797661165e-8);
close(screen.models[1].hazardPerEURConditionalRange[1],7.851855673919164e-8);
assert.equal(screen.assumptions.sameConfigurationAcrossHistoricalAwards,false);
assert.equal(screen.assumptions.constantHazardPerEUR,false);
assert.equal(screen.breakEvenJackpotEUR,null);
assert.equal(screen.realMoneyAllowed,false);

assert.equal(MILLIONAIRE_GENIE_CURRENT_ECONOMICS.specificGamePage.growthRateFraction,0.035);
assert.equal(MILLIONAIRE_GENIE_CURRENT_ECONOMICS.disclosureConflict.studioOverviewGrowthRateFraction,0.02);
assert.equal(MILLIONAIRE_GENIE_CURRENT_ECONOMICS.disclosureConflict.safeGrowthRateFraction,null);
assert.equal(MILLIONAIRE_GENIE_CURRENT_ECONOMICS.breakEvenJackpotEUR,null);
assert.equal(MILLIONAIRE_GENIE_CURRENT_ECONOMICS.realMoneyAllowed,false);

assert.match(wrangler,/"main"\s*:\s*"src\/index-v19\.mjs"/);
assert.ok(worker.includes("edge-sentinel-v19-spanish-jackpot-awards-20260824a"));
assert.ok(worker.includes("path==='/science/spanish-awards'"));
assert.ok(worker.includes('aggregateCountsNeverExpandedIntoSyntheticAwards:true'));
assert.ok(worker.includes('conditionalHazardScreenCannotPromote:true'));
assert.ok(worker.includes('meterResetCandidateIsNotAwardProof:true'));
assert.ok(loader.includes("import './edge-spanish-awards-client-v1.mjs'"));
assert.ok(ui.includes('ARCHIVO PREMIOS ES · JACKPOTS'));
assert.ok(ui.includes('threshold: NO CERRADO'));
assert.equal(semantics.currentLeader.reconstructedIndividualAwards,20);
assert.equal(semantics.hardGuards.aggregateCountsNeverExpandedIntoSyntheticAwards,true);
assert.equal(semantics.hardGuards.currentContributionDisclosureConflictBlocksThreshold,true);
assert.equal(semantics.hardGuards.realMoneyAllowed,false);
assert.equal(contract.enabled,false);
assert.equal(contract.realMoneyAllowed,false);
assert.equal(contract.scientificGatePassed,false);
console.log('edge-spanish-jackpot-awards-v19.test.mjs: PASS');
