import assert from 'node:assert/strict';
import fs from 'node:fs';

const registry=JSON.parse(fs.readFileSync('loterias-ai/edge-live/opportunity-registry-v1.json','utf8'));
const lane=(registry.mappings||[]).find(x=>x.id==='botemania-winfall-wishes-progressive');
assert.ok(lane,'Winfall must remain visible in the EDGE opportunity registry');
assert.equal(lane.game?.id,'winfall-wishes-jackpot');
assert.equal(lane.game?.url,'https://www.botemania.es/juegos/slots-online/winfall-wishes-jackpot');
assert.equal(lane.network,'generic');
assert.equal(lane.feedId,'tikitemple2_1');
assert.equal(lane.identity?.verified,false,'candidate shared meter must never be promoted by registry configuration');
assert.match(lane.identity?.evidenceClass||'',/UNVERIFIED_TIKI_TEMPLO_COUNTER_CANDIDATE/);
assert.equal(lane.economic?.publishedBaseRtpPct,94.85);
assert.equal(lane.economic?.averageJackpotContributionPct,0.6);
assert.equal(lane.economic?.publishedBasePlusKnownContributionPct,95.45);
assert.equal(lane.economic?.zeroResetPublished,true);
assert.equal(lane.economic?.breakEvenJackpotEUR,null);
assert.equal(lane.execution?.exactStakeKnown,true);
assert.equal(lane.execution?.stakePerDecisionEUR,0.25);
assert.equal(lane.execution?.strategyVerified,false);
assert.equal(lane.guards?.candidateFeedNeverEqualsVerifiedIdentity,true);
assert.equal(lane.guards?.sharedPotBridgeRequiresExactPartnerIdentity,true);
assert.equal(lane.guards?.noForeignSeedImport,true);
assert.equal(registry.guards?.candidateFeedNeverEqualsVerifiedIdentity,true);

console.log('winfall-edge-registry-v1.test.mjs: PASS');
