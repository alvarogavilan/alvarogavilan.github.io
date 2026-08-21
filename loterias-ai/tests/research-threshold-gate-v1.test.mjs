#!/usr/bin/env node
import assert from 'node:assert/strict';
import { gateResearchThresholdZone } from '../edge-live/research-threshold-gate-v1.mjs';

const stale=gateResearchThresholdZone({nominalZone:'NEAR_RESEARCH_THRESHOLD',dynamicFreshnessVerified:false,configurationEquivalentVerified:false,currencyNetworkEquivalentVerified:false});
assert.equal(stale.nominalNearOrAbove,true);
assert.equal(stale.zone,'DYNAMIC_STATE_NOT_VERIFIED');
assert.equal(stale.countsAsNearOrAboveResearchThreshold,false);

const freshButCrossUnit=gateResearchThresholdZone({nominalZone:'ABOVE_RESEARCH_THRESHOLD',dynamicFreshnessVerified:true,configurationEquivalentVerified:false,currencyNetworkEquivalentVerified:false});
assert.equal(freshButCrossUnit.zone,'CROSS_UNIT_CONFIGURATION_NOT_VERIFIED');
assert.equal(freshButCrossUnit.countsAsNearOrAboveResearchThreshold,false);

const verified=gateResearchThresholdZone({nominalZone:'NEAR_RESEARCH_THRESHOLD',dynamicFreshnessVerified:true,configurationEquivalentVerified:true,currencyNetworkEquivalentVerified:true});
assert.equal(verified.zone,'NEAR_RESEARCH_THRESHOLD');
assert.equal(verified.operationalThresholdComparable,true);
assert.equal(verified.countsAsNearOrAboveResearchThreshold,true);

console.log('research-threshold-gate-v1.test.mjs: ok');
