import assert from 'node:assert/strict';
import fs from 'node:fs';
import { aliasComparison, applyPermanentAliasDisproof, closeTikiTemploLane } from '../edge-live/botemania-tiki-templo-closure-v1.mjs';

const divergence=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/tiki-alice-simultaneous-divergence-v1.json','utf8'));
assert.equal(divergence.conclusion?.exactAliasDisproved,true);
assert.equal(divergence.meters?.['generic:tikitemple2_1']?.amountEUR,1062.65);
assert.equal(divergence.meters?.['generic:progressivealice1']?.amountEUR,1062.79);

// Even if rolling summaries happen to coincide again later, one documented
// same-sample divergence permanently disproves one exact meter/alias.
const same={currentAmountEUR:1100,previousAmountEUR:1099,firstSeenAt:'t0',lastObservedAt:'t1',lastChangedAt:'t1',observationCount:100,changeCount:20};
const rolling=aliasComparison(same,{...same});
assert.equal(rolling.verdict,'SUMMARY_STATE_DUPLICATE_OR_SHARED_POOL_HIGH_CONFIDENCE');
const guarded=applyPermanentAliasDisproof(rolling,divergence);
assert.equal(guarded.verdict,'NOT_EXACT_ALIAS_OBSERVED_DIVERGENCE');
assert.equal(guarded.exactAliasDisproved,true);
assert.equal(guarded.relatedOrCorrelatedPoolStillPossible,true);

const ledger={meters:{
  'generic:tikitemple2_1':same,
  'generic:progressivealice1':{...same},
}};
const result=closeTikiTemploLane({ledger,identityProbe:null,divergenceEvidence:divergence});
assert.equal(result.aliasClosure.verdict,'NOT_EXACT_ALIAS_OBSERVED_DIVERGENCE');
assert.equal(result.identityClosure.aliasCandidateRelationship,'RELATED_OR_CORRELATED_POOL_UNRESOLVED');
assert.equal(result.guards.exactAliasDisproofIsMonotonic,true);

const registry=JSON.parse(fs.readFileSync('loterias-ai/edge-live/opportunity-registry-v1.json','utf8'));
const tiki=registry.mappings.find(x=>x.id==='botemania-tiki-templo-progressive');
assert.ok(tiki);
assert.equal(tiki.lifecycle?.aliasOf,null);
assert.equal(tiki.lifecycle?.aliasVerdict,'NOT_EXACT_ALIAS_OBSERVED_DIVERGENCE');
assert.equal(tiki.lifecycle?.relatedPoolCandidate,'generic:progressivealice1');
console.log('tiki-alias-divergence-v1.test.mjs: ok');
