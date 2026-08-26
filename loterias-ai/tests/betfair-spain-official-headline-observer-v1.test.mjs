import assert from 'node:assert/strict';
import fs from 'node:fs';
import {evaluateBetfairSpainOfficialHeadlineSequence} from '../casino/jackpots/betfair-spain-official-headline-observer-v1.mjs';

const p='loterias-ai/edge-live/evidence/betfair-spain-apmccoy-official-headline-observer-v1.json';
const d=JSON.parse(fs.readFileSync(p,'utf8'));

assert.equal(d.market,'ES');
assert.equal(d.sourceType,'ONLINE');
assert.equal(d.promotion,false);
assert.equal(d.execution.decision,'NO_PLAY');
assert.equal(d.execution.realMoneyAllowed,false);
assert.equal(d.execution.realStakeEUR,0);
assert.equal(d.execution.maxSpins,0);
assert.equal(d.execution.maxTotalStakeEUR,0);

const r=evaluateBetfairSpainOfficialHeadlineSequence({observations:d.observations});
assert.equal(r.valid,true);
assert.equal(r.stateChangeVerified,true);
assert.equal(r.latestAmountEUR,9333.23);
assert.ok(Math.abs(r.netDeltaEUR-154.98)<1e-9);
assert.equal(r.elapsedSeconds,11040);
assert.equal(r.transitions[0].classification,'GROWTH');
assert.equal(r.headlineTierBindingVerified,false);
assert.equal(r.canInferDailyAmount,false);
assert.equal(r.canInferTickerState,false);
assert.equal(r.canInferGuaranteedHitTime,false);
assert.equal(r.usableForExecution,false);
assert.equal(r.guards.realMoneyAllowed,false);

const badTier=evaluateBetfairSpainOfficialHeadlineSequence({observations:d.observations.map((x,i)=>i===0?{...x,headlineTierBindingVerified:true}:x)});
assert.equal(badTier.valid,false);
assert.equal(badTier.reason,'TIER_BINDING_MUST_REMAIN_UNVERIFIED');

const drop=evaluateBetfairSpainOfficialHeadlineSequence({observations:[d.observations[0],{...d.observations[1],amountEUR:100}]});
assert.equal(drop.valid,true);
assert.equal(drop.transitions[0].classification,'DROP_RESET_OR_AWARD_CANDIDATE');
assert.equal(drop.usableForExecution,false);

console.log('betfair-spain-official-headline-observer-v1.test.mjs: PASS');
