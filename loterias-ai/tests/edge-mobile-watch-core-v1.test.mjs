import assert from 'node:assert/strict';
import {
  parseGraphqlBody,
  detectResetEvents,
  evaluateTikiAlicePairedReset,
  jpkJointCapture,
  TIKI_ALICE_FROZEN_GATE,
  RESET_DROP_FRACTION_THRESHOLD,
  processPoll,
  evaluateCoverageGap,
  computeMaxContinuousGapSeconds,
  resolveObservedAt,
  createPollScheduler,
  graphqlNodeRequestInit,
  graphqlBrowserRequestInit,
  nonSafelistedRequestHeaderNames,
} from '../mobile/edge-live-watch/core-v1.mjs';

// parseGraphqlBody: normal case
{
  const body = { data: { jackpots: [{ id: 'pool1', amount: 212.09 }], redTigerJackpots: [], blueprintJackpots: [{ id: 'JACKPOTKING', amount: 128000 }] } };
  const { currentByKey, ambiguousKeys } = parseGraphqlBody(body);
  assert.equal(currentByKey['generic:pool1'].amountEUR, 212.09);
  assert.equal(currentByKey['blueprint:JACKPOTKING'].amountEUR, 128000);
  assert.deepEqual(ambiguousKeys, []);
}

// parseGraphqlBody: alias collapse (equal amounts) vs ambiguous (differing amounts)
{
  const body = {
    data: {
      jackpots: [{ id: 'dup1', amount: 5 }, { id: 'dup1', amount: 5 }, { id: 'ambig1', amount: 5 }, { id: 'ambig1', amount: 7 }],
      redTigerJackpots: [], blueprintJackpots: [],
    },
  };
  const { currentByKey, ambiguousKeys } = parseGraphqlBody(body);
  assert.equal(currentByKey['generic:dup1'].amountEUR, 5);
  assert.equal(currentByKey['generic:ambig1'], undefined);
  assert.deepEqual(ambiguousKeys, ['generic:ambig1']);
}

// parseGraphqlBody: malformed entries fail closed (dropped, not thrown)
{
  const body = { data: { jackpots: [{ id: '', amount: 5 }, { id: 'x', amount: 'not-a-number' }, { amount: 5 }], redTigerJackpots: null, blueprintJackpots: undefined } };
  const { rows } = parseGraphqlBody(body);
  assert.deepEqual(rows, []);
}
assert.deepEqual(parseGraphqlBody(null).rows, []);
assert.deepEqual(parseGraphqlBody({}).rows, []);

// detectResetEvents: real threshold behavior (>=20% drop required)
{
  const prev = { 'generic:pool1': { network: 'generic', id: 'pool1', amountEUR: 100 } };
  const cur79 = { 'generic:pool1': { network: 'generic', id: 'pool1', amountEUR: 79 } }; // 21% drop -> reset
  const cur81 = { 'generic:pool1': { network: 'generic', id: 'pool1', amountEUR: 81 } }; // 19% drop -> not a reset
  assert.equal(detectResetEvents(cur79, prev, 't2', 't1').length, 1);
  assert.equal(detectResetEvents(cur81, prev, 't2', 't1').length, 0);
}

// detectResetEvents: growth, equal, or missing prior never counts as a reset
{
  const prev = { 'generic:x': { network: 'generic', id: 'x', amountEUR: 10 } };
  assert.equal(detectResetEvents({ 'generic:x': { network: 'generic', id: 'x', amountEUR: 15 } }, prev, 't2', 't1').length, 0);
  assert.equal(detectResetEvents({ 'generic:x': { network: 'generic', id: 'x', amountEUR: 10 } }, prev, 't2', 't1').length, 0);
  assert.equal(detectResetEvents({ 'generic:x': { network: 'generic', id: 'x', amountEUR: 1 } }, {}, 't2', 't1').length, 0);
}

// evaluateTikiAlicePairedReset: the real frozen gate values replay as a match
{
  const events = [
    { key: 'generic:tikitemple2_1', observedAt: 'T', previousAmountEUR: 1208.43, currentAmountEUR: 2.82 },
    { key: 'generic:progressivealice1', observedAt: 'T', previousAmountEUR: 1208.43, currentAmountEUR: 2.82 },
  ];
  const r = evaluateTikiAlicePairedReset(events);
  assert.equal(r.status, 'PROSPECTIVE_PAIRED_RESET_CANDIDATE');
  assert.equal(r.exactAliasVerified, false);
  assert.equal(r.evEnabled, false);
  assert.equal(r.realMoneyAllowed, false);
  assert.equal(r.forFeed, 'tiki-alice-paired-reset-relationship-v1');
}

// evaluateTikiAlicePairedReset: never a false positive on mismatched timestamps, amounts, or a lone reset
{
  const tikiOnly = [{ key: 'generic:tikitemple2_1', observedAt: 'T', previousAmountEUR: 100, currentAmountEUR: 1 }];
  assert.equal(evaluateTikiAlicePairedReset(tikiOnly), null);

  const mismatchedTime = [
    { key: 'generic:tikitemple2_1', observedAt: 'T1', previousAmountEUR: 100, currentAmountEUR: 1 },
    { key: 'generic:progressivealice1', observedAt: 'T2', previousAmountEUR: 100, currentAmountEUR: 1 },
  ];
  assert.equal(evaluateTikiAlicePairedReset(mismatchedTime), null);

  const mismatchedAmounts = [
    { key: 'generic:tikitemple2_1', observedAt: 'T', previousAmountEUR: 1062.65, currentAmountEUR: 1 },
    { key: 'generic:progressivealice1', observedAt: 'T', previousAmountEUR: 1062.79, currentAmountEUR: 1 },
  ];
  // Real historical divergence (1062.65 vs 1062.79) must NOT be treated as a match under a 0.01 tolerance.
  assert.equal(evaluateTikiAlicePairedReset(mismatchedAmounts), null);
}

// jpkJointCapture: complete only when all three tiers are present together
{
  const full = { 'blueprint:JACKPOTKING': { amountEUR: 1 }, 'blueprint:JACKPOTKING_REGAL': { amountEUR: 2 }, 'blueprint:JACKPOTKING_ROYAL': { amountEUR: 3 } };
  assert.equal(jpkJointCapture(full).complete, true);
  const partial = { 'blueprint:JACKPOTKING': { amountEUR: 1 } };
  assert.equal(jpkJointCapture(partial).complete, false);
  assert.equal(jpkJointCapture(partial).rows['blueprint:JACKPOTKING_REGAL'], null);
}

assert.equal(RESET_DROP_FRACTION_THRESHOLD, 0.20);
assert.equal(TIKI_ALICE_FROZEN_GATE.independentPairedResetCount, 1);
assert.equal(TIKI_ALICE_FROZEN_GATE.requiredForPromotion, 2);

// --- Gap-contamination fix: real bug caught in review. A drop compared
// across an unobserved iOS background suspension (or any other unexplained
// gap) must never be treated as a clean prospective reset - it must not
// feed JPK's clean-window count, Tiki/Alice pairing, or any future
// hazard/seed inference. ---

const T0 = '2026-08-22T12:00:00.000Z';
const T1_CONTINUOUS = '2026-08-22T12:00:45.000Z'; // 45s later, within the 30-60s poll range
const T1_AFTER_GAP = '2026-08-22T12:20:00.000Z'; // 20 minutes later

// 1. Normal continuous poll, real drop => detected as a clean reset.
{
  const previousState = { byKey: { 'generic:pool1': { network: 'generic', id: 'pool1', amountEUR: 100 } }, observedAt: T0 };
  const currentByKey = { 'generic:pool1': { network: 'generic', id: 'pool1', amountEUR: 1 } };
  const result = processPoll({ currentByKey, previousState, observedAt: T1_CONTINUOUS, backgroundGapSeconds: 0, pollSeconds: 45 });
  assert.equal(result.coverage.continuousCoverage, true);
  assert.equal(result.resetEvents.length, 1);
  assert.equal(result.contaminatedEvents.length, 0);
}

// 2. A recorded iOS background gap plus a real drop => NOT a clean reset.
{
  const previousState = { byKey: { 'generic:pool1': { network: 'generic', id: 'pool1', amountEUR: 100 } }, observedAt: T0 };
  const currentByKey = { 'generic:pool1': { network: 'generic', id: 'pool1', amountEUR: 1 } };
  const result = processPoll({ currentByKey, previousState, observedAt: T1_AFTER_GAP, backgroundGapSeconds: 1150, pollSeconds: 45 });
  assert.equal(result.coverage.continuousCoverage, false);
  assert.equal(result.resetEvents.length, 0, 'a contaminated drop must never appear in resetEvents');
  assert.equal(result.contaminatedEvents.length, 1);
  assert.equal(result.contaminatedEvents[0].eventType, 'RESET_ACROSS_COVERAGE_GAP');
  assert.equal(result.contaminatedEvents[0].eligibleForCleanReset, false);
  assert.equal(result.contaminatedEvents[0].eligibleForJpkCleanWindow, false);
  assert.equal(result.contaminatedEvents[0].eligibleForTikiAlicePairing, false);
  assert.equal(result.contaminatedEvents[0].eligibleForHazardInference, false);
}

// 3. Tiki/Alice both drop identically across a gap => must NOT produce a
// PROSPECTIVE_PAIRED_RESET_CANDIDATE, even though the amounts would
// otherwise match the frozen gate's own pattern exactly.
{
  const previousState = {
    byKey: {
      'generic:tikitemple2_1': { network: 'generic', id: 'tikitemple2_1', amountEUR: 1208.43 },
      'generic:progressivealice1': { network: 'generic', id: 'progressivealice1', amountEUR: 1208.43 },
    },
    observedAt: T0,
  };
  const currentByKey = {
    'generic:tikitemple2_1': { network: 'generic', id: 'tikitemple2_1', amountEUR: 2.82 },
    'generic:progressivealice1': { network: 'generic', id: 'progressivealice1', amountEUR: 2.82 },
  };
  const result = processPoll({ currentByKey, previousState, observedAt: T1_AFTER_GAP, backgroundGapSeconds: 1150, pollSeconds: 45 });
  assert.equal(result.pairedCandidate, null, 'a paired candidate must never be produced across a coverage gap');
  assert.equal(result.contaminatedEvents.length, 2);
}

// 4. A JPK tier drops across a gap => must not be usable as a clean JPK
// reset window (i.e. it must not appear in resetEvents at all).
{
  const previousState = {
    byKey: {
      'blueprint:JACKPOTKING': { network: 'blueprint', id: 'JACKPOTKING', amountEUR: 128000 },
      'blueprint:JACKPOTKING_REGAL': { network: 'blueprint', id: 'JACKPOTKING_REGAL', amountEUR: 15500 },
      'blueprint:JACKPOTKING_ROYAL': { network: 'blueprint', id: 'JACKPOTKING_ROYAL', amountEUR: 3800 },
    },
    observedAt: T0,
  };
  const currentByKey = {
    'blueprint:JACKPOTKING': { network: 'blueprint', id: 'JACKPOTKING', amountEUR: 500 },
    'blueprint:JACKPOTKING_REGAL': { network: 'blueprint', id: 'JACKPOTKING_REGAL', amountEUR: 15550 },
    'blueprint:JACKPOTKING_ROYAL': { network: 'blueprint', id: 'JACKPOTKING_ROYAL', amountEUR: 500 },
  };
  const result = processPoll({ currentByKey, previousState, observedAt: T1_AFTER_GAP, backgroundGapSeconds: 1150, pollSeconds: 45 });
  assert.equal(result.resetEvents.length, 0);
  assert.ok(result.contaminatedEvents.some((e) => e.key === 'blueprint:JACKPOTKING'));
  assert.ok(result.contaminatedEvents.some((e) => e.key === 'blueprint:JACKPOTKING_ROYAL'));
}

// 5. After a contaminated poll, the state is always rebaselined - the very
// next poll, if continuous, detects normally again.
{
  const previousState = { byKey: { 'generic:pool1': { network: 'generic', id: 'pool1', amountEUR: 100 } }, observedAt: T0 };
  const currentByKey1 = { 'generic:pool1': { network: 'generic', id: 'pool1', amountEUR: 1 } };
  const contaminated = processPoll({ currentByKey: currentByKey1, previousState, observedAt: T1_AFTER_GAP, backgroundGapSeconds: 1150, pollSeconds: 45 });
  assert.equal(contaminated.resetEvents.length, 0);
  assert.deepEqual(contaminated.newState, { byKey: currentByKey1, observedAt: T1_AFTER_GAP });

  // Next poll, 45s later, continuous, a further real drop.
  const nextObservedAt = '2026-08-22T12:20:45.000Z';
  const currentByKey2 = { 'generic:pool1': { network: 'generic', id: 'pool1', amountEUR: 0.5 } };
  const next = processPoll({ currentByKey: currentByKey2, previousState: contaminated.newState, observedAt: nextObservedAt, backgroundGapSeconds: 0, pollSeconds: 45 });
  assert.equal(next.coverage.continuousCoverage, true);
  assert.equal(next.resetEvents.length, 1, 'detection must work normally again once coverage resumes');
}

// evaluateCoverageGap: the very first sample (no previous state) is never
// itself contaminated - there is nothing to compare it against yet.
assert.deepEqual(
  evaluateCoverageGap({ observedAt: T0, previousObservedAt: null, backgroundGapSeconds: 0, pollSeconds: 45 }),
  { continuousCoverage: true, coverageGapSeconds: 0, elapsedSeconds: 0, maxContinuousGapSeconds: null, missedExpectedPoll: false },
);

// --- Second review: MAX_CONTINUOUS_GAP_SECONDS must be DERIVED from the
// configured poll interval, not a fixed constant - a fixed 150s margin let a
// 30s-cadence watcher silently absorb ~4 missed scheduled polls. ---

// computeMaxContinuousGapSeconds: jitter allowance is min(10, 25% of
// pollSeconds), so the threshold scales with cadence but stays narrowly
// bounded (never more than +10s regardless of how large pollSeconds is).
assert.equal(computeMaxContinuousGapSeconds(30), 37.5); // jitter = min(10, 7.5) = 7.5
assert.equal(computeMaxContinuousGapSeconds(60), 70); // jitter = min(10, 15) = 10
assert.throws(() => computeMaxContinuousGapSeconds(0));
assert.throws(() => computeMaxContinuousGapSeconds(-5));

// poll=30: an elapsed interval inside the derived threshold is continuous;
// anything past it - even one missed scheduled poll (~70s, more than 2x the
// 30s cadence) - is NOT.
{
  const withinThreshold = evaluateCoverageGap({ observedAt: '2026-08-22T12:00:37.000Z', previousObservedAt: T0, backgroundGapSeconds: 0, pollSeconds: 30 });
  assert.equal(withinThreshold.continuousCoverage, true);
  assert.equal(withinThreshold.missedExpectedPoll, false);

  const oneMissedPoll = evaluateCoverageGap({ observedAt: '2026-08-22T12:01:10.000Z', previousObservedAt: T0, backgroundGapSeconds: 0, pollSeconds: 30 });
  assert.equal(oneMissedPoll.continuousCoverage, false);
  assert.equal(oneMissedPoll.missedExpectedPoll, true);
}

// poll=60: same shape, scaled threshold (70s), defined and tested behavior
// on both sides of the boundary.
{
  const withinThreshold = evaluateCoverageGap({ observedAt: '2026-08-22T12:01:05.000Z', previousObservedAt: T0, backgroundGapSeconds: 0, pollSeconds: 60 }); // 65s <= 70s
  assert.equal(withinThreshold.continuousCoverage, true);

  const beyondThreshold = evaluateCoverageGap({ observedAt: '2026-08-22T12:01:35.000Z', previousObservedAt: T0, backgroundGapSeconds: 0, pollSeconds: 60 }); // 95s > 70s
  assert.equal(beyondThreshold.continuousCoverage, false);
  assert.equal(beyondThreshold.missedExpectedPoll, true);
}

// processPoll end-to-end: a poll cadence of 30s where the actual gap implies
// one missed scheduled poll must produce a contaminated event, not a clean one.
{
  const previousState = { byKey: { 'generic:pool1': { network: 'generic', id: 'pool1', amountEUR: 100 } }, observedAt: T0 };
  const currentByKey = { 'generic:pool1': { network: 'generic', id: 'pool1', amountEUR: 1 } };
  const result = processPoll({ currentByKey, previousState, observedAt: '2026-08-22T12:01:10.000Z', backgroundGapSeconds: 0, pollSeconds: 30 });
  assert.equal(result.coverage.missedExpectedPoll, true);
  assert.equal(result.resetEvents.length, 0);
  assert.equal(result.contaminatedEvents.length, 1);
}

// --- Second review: observedAt must be the response-received instant, not
// the request-sent instant - a slow request must never be attributed to the
// earlier wall-clock moment (it would understate the true elapsed interval
// and could let a genuinely discontinuous pair slip past the check above). ---
{
  const requestStartedAt = '2026-08-22T12:00:00.000Z';
  const responseReceivedAt = '2026-08-22T12:00:40.000Z'; // a 40s-slow request
  const resolved = resolveObservedAt({ requestStartedAt, responseReceivedAt });
  assert.equal(resolved, responseReceivedAt, 'must use the response time, never the request time');
  assert.notEqual(resolved, requestStartedAt);
}

// --- Second review: setInterval(pollOnce) permits overlapping polls if a
// fetch runs long, racing previousState. createPollScheduler must make
// overlap structurally impossible - the next cycle is only scheduled after
// the current one fully settles. ---
{
  let concurrentCalls = 0;
  let maxConcurrentCalls = 0;
  let totalCalls = 0;
  const callDurationsMs = [30, 5, 5]; // first call is deliberately slow

  const scheduler = createPollScheduler({
    delayMs: 10, // much shorter than the slow call's own duration - would overlap under plain setInterval
    async runPoll() {
      concurrentCalls++;
      maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);
      totalCalls++;
      const duration = callDurationsMs[Math.min(totalCalls - 1, callDurationsMs.length - 1)];
      await new Promise((resolve) => setTimeout(resolve, duration));
      concurrentCalls--;
    },
  });

  await new Promise((resolve) => {
    scheduler.start();
    setTimeout(() => { scheduler.stop(); resolve(); }, 120);
  });

  assert.equal(maxConcurrentCalls, 1, 'no two poll cycles must ever run concurrently, even when one runs long');
  assert.ok(totalCalls >= 2, 'the scheduler must still make forward progress after a slow cycle');
  assert.equal(scheduler.isRunning(), false, 'stop() must actually stop further cycles');
}

// --- CORS/header fix: browser-safe request init must never include
// forbidden header names (Origin, Referer), which page JS cannot set. ---
{
  const nodeInit = graphqlNodeRequestInit();
  const browserInit = graphqlBrowserRequestInit();
  assert.ok('origin' in nodeInit.headers);
  assert.ok('referer' in nodeInit.headers);
  assert.ok(!('origin' in browserInit.headers), 'browser init must never attempt to set the forbidden Origin header');
  assert.ok(!('referer' in browserInit.headers), 'browser init must never attempt to set the forbidden Referer header');
  assert.equal(browserInit.headers.venture, 'botemania_es');
  assert.equal(browserInit.body, nodeInit.body, 'the GraphQL query/body itself must stay identical between both paths');
}

// --- CORS preflight-parity fix: graphqlBrowserRequestInit() previously sent
// a 'cache-control' header that cors-preflight-probe-v1.mjs's hardcoded
// 'access-control-request-headers': 'content-type,venture' literal did not
// account for - the probe was validating a preflight that was not exactly
// what the real browser app would trigger. Fixed by (1) removing the
// functionally-inert cache-control header from the browser path entirely,
// and (2) having the probe derive its requested-header list from this same
// nonSafelistedRequestHeaderNames() helper instead of a hand-written
// literal, so the two can never silently diverge again. ---
{
  const browserInit = graphqlBrowserRequestInit();
  assert.ok(!('cache-control' in browserInit.headers), 'the browser request must never send cache-control: it has no effect on an uncached POST response and only needlessly widens the CORS preflight surface');

  const requested = nonSafelistedRequestHeaderNames(browserInit.headers);
  assert.deepEqual(requested, ['content-type', 'venture'], 'this is exactly the Access-Control-Request-Headers list a real browser would send for the current graphqlBrowserRequestInit() headers');
  assert.ok(!requested.includes('accept'), 'Accept is always CORS-safelisted regardless of value and must never appear here');
}
// A non-safelisted Content-Type value (anything other than the three
// safelisted essences) must always be reported as non-safelisted...
{
  const names = nonSafelistedRequestHeaderNames({ accept: 'application/json', 'content-type': 'application/json' });
  assert.deepEqual(names, ['content-type']);
}
// ...while a genuinely safelisted Content-Type value must not be, even with
// a charset parameter appended (only the essence before ';' matters).
{
  const names = nonSafelistedRequestHeaderNames({ 'content-type': 'text/plain;charset=UTF-8', 'accept-language': 'es' });
  assert.deepEqual(names, []);
}

console.log('edge-mobile-watch-core-v1.test.mjs: PASS');
