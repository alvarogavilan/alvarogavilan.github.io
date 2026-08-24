import assert from 'node:assert/strict';
import fs from 'node:fs';

const wrangler=fs.readFileSync('loterias-ai/edge-backend/wrangler.jsonc','utf8');
const v12=fs.readFileSync('loterias-ai/edge-backend/src/index-v12.mjs','utf8');
const history=fs.readFileSync('loterias-ai/edge-live/edge-history-client-v1.mjs','utf8');
const ux=fs.readFileSync('loterias-ai/edge-live/edge-live-ux-v1.mjs','utf8');
const e=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/jackpot-cycle-ledger-semantics-v1.json','utf8'));

assert.match(wrangler,/"main"\s*:\s*"src\/index-v12\.mjs"/);
assert.ok(v12.includes("edge-sentinel-v12-jackpot-cycles-20260824a"));
assert.ok(v12.includes('CREATE TABLE IF NOT EXISTS meter_active_cycles'));
assert.ok(v12.includes('CREATE TABLE IF NOT EXISTS meter_cycles'));
assert.ok(v12.includes("path==='/science/cycles'"));
assert.ok(v12.includes('RESET_MIN_ABS_EUR=1'));
assert.ok(v12.includes('RESET_MIN_REL=0.20'));
assert.ok(v12.includes("LEFT_CENSORED_FIRST_V12_OBSERVATION"));
assert.ok(v12.includes("OBSERVED_RESET_OR_AWARD_CANDIDATE_BOUNDARY"));
assert.ok(v12.includes("FULL_OBSERVED_BETWEEN_RESET_CANDIDATE_BOUNDARIES"));
assert.ok(v12.includes("type:'CYCLE_CLOSED_CANDIDATE'"));
assert.ok(v12.includes('awardVerified:false'));
assert.ok(v12.includes('resetCandidateIsNotVerifiedAward:true'));
assert.ok(v12.includes('completedCandidateCycleIsNotJackpotWinProof:true'));
assert.ok(v12.includes('noPreV12FullCycleFabrication:true'));
assert.ok(v12.includes('cycleStatisticsDoNotProveHazard:true'));
assert.ok(v12.includes('cycleStatisticsCannotEnableRealMoney:true'));
assert.ok(v12.includes('realMoneyAllowed:false'));

assert.ok(ux.includes("import './edge-history-client-v1.mjs'"));
assert.ok(history.includes('/science/ath?limit=1000'));
assert.ok(history.includes('/science/cycles?limit=500'));
assert.ok(history.includes('HISTORIA 24/7'));
assert.ok(history.includes('HISTORIA ≠ EV'));
assert.ok(history.includes('reset candidato ≠ premio'));
assert.ok(history.includes('ciclo completo candidato ≠ jackpot ganado'));

assert.equal(e.status,'RESEARCH_ONLY_NO_PLAY');
assert.equal(e.realMoneyAllowed,false);
assert.equal(e.endpoint,'/science/cycles');
assert.equal(e.resetCandidateDefinition.minimumAbsoluteDropEUR,1);
assert.equal(e.resetCandidateDefinition.minimumRelativeDrop,0.20);
assert.ok(e.perCycleFields.includes('observedPeakEUR'));
assert.ok(e.perCycleFields.includes('cycleCompleteness'));
assert.ok(e.perMeterStatistics.includes('averageFullObservedDurationMs'));
assert.equal(e.hardGuards.resetCandidateIsNotVerifiedAward,true);
assert.equal(e.hardGuards.noPreV12FullCycleFabrication,true);
assert.equal(e.hardGuards.averageCycleDoesNotMeanOverdue,true);
assert.equal(e.hardGuards.cyclePeakProximityDoesNotMeanPositiveEv,true);
assert.equal(e.hardGuards.executionContractRemainsSoleGreenAuthority,true);
assert.equal(e.hardGuards.realMoneyAllowed,false);

console.log('edge-jackpot-cycle-ledger-v12.test.mjs: PASS');
