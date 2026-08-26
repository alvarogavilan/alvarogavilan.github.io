import assert from 'node:assert/strict';
import {summarizeP0NorseProgress} from '../edge-live/edge-research-progress-v1.mjs';

const data={p0Strategy:{stateObservationGate:{operator:'JOKERBET',game:'Gods and Giants',currentPublicPageVerified:true,dailyMechanicPublishedOnCurrentPage:true,spanishInteroperatorPlaytechNetworkVerified:true,directGameToAognjp2BindingVerified:false},currentDeploymentConfigurationGate:{currentSpanishJackpotCategoryPresenceVerified:true,exactAognjp2LinkedTitleCurrentlyInJackpotCategory:true,dailyTierPublishedForSameOperatorTitle:true,dailyDeploymentConfiguredEvidenceStrong:true,providerCodeBindingAognjp2ToBookOfDwarvesVerified:true},tickerIdentityGate:{game:'Book of Dwarves',aognjp2ToBookOfDwarvesProviderBindingVerified:true,exactSpanishTickerImsBindingVerified:false}}};
const s=summarizeP0NorseProgress(data);
assert.equal(s.ready,true);
assert.equal(s.closed,5);
assert.equal(s.total,9);
assert.equal(s.pct,55.6);
assert.equal(s.configuration.closed,4);
assert.equal(s.configuration.total,4);
assert.equal(s.configuration.pct,100);
assert.equal(s.identity.closed,1);
assert.equal(s.identity.total,2);
assert.equal(s.live.closed,0);
assert.equal(s.live.total,3);
assert.equal(s.open.length,4);

const progressed={p0Strategy:{stateObservationGate:{...data.p0Strategy.stateObservationGate,sameSessionDailyActiveVerified:true,currentDailyJackpotEUR:123.45,guaranteedHitTime:1780000000,exactTickerHostRecovered:true,exactImsCasinoRecovered:true},currentDeploymentConfigurationGate:data.p0Strategy.currentDeploymentConfigurationGate,tickerIdentityGate:{...data.p0Strategy.tickerIdentityGate,exactSpanishTickerImsBindingVerified:true}}};
const p=summarizeP0NorseProgress(progressed);
assert.equal(p.closed,9);
assert.equal(p.pct,100);
assert.equal(p.identity.closed,2);
assert.equal(p.live.closed,3);

const none=summarizeP0NorseProgress({});
assert.equal(none.ready,false);
assert.equal(none.total,9);
console.log('edge-research-progress-v1.test.mjs: PASS');
