import assert from 'node:assert/strict';
import fs from 'node:fs';

const e=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/classic-video-poker-progressive-claim-v1.json','utf8'));
const p=JSON.parse(fs.readFileSync('loterias-ai/edge-live/evidence/green-distance-priority-v1.json','utf8'));

assert.equal(e.status,'DISCOVERY_CANDIDATE_UNBOUND_NO_PLAY');
assert.equal(e.realMoneyAllowed,false);
assert.equal(e.game.name,'Classic Video Poker');
assert.equal(e.game.feedId,null);
assert.equal(e.currentOperatorEvidence.casinoCategoryPage.progressiveClaimPresent,true);
assert.equal(e.currentOperatorEvidence.exactTitlePage.progressiveMechanismTextPresent,false);
assert.equal(e.currentOperatorEvidence.exactTitlePage.exactPaytablePresent,false);
assert.deepEqual(e.currentOperatorEvidence.exactTitlePage.handCounts,[1,5,10,25]);
assert.deepEqual(e.currentOperatorEvidence.exactTitlePage.publishedVideoPokerRtpRangePct,[96.77,99.26]);
assert.equal(e.relationshipToUltimateVideoPoker.sameGame,false);
assert.equal(e.relationshipToUltimateVideoPoker.sameProgressivePoolVerified,false);
assert.equal(e.relationshipToUltimateVideoPoker.mayReuseUltimateFeedId,false);
assert.equal(e.relationshipToUltimateVideoPoker.ultimateKnownCandidateFeedId,'generic:WAGER_BET');
assert.equal(e.classification.currentProgressiveClaimVerifiedAtCategoryLevel,true);
assert.equal(e.classification.progressiveMechanismVerifiedAtGameLevel,false);
assert.equal(e.classification.exactFeedBindingVerified,false);
assert.equal(e.classification.thresholdVerified,false);
assert.equal(e.decision.keepAsSeparateResearchLane,true);
assert.equal(e.decision.promoteIntoUltimateVideoPokerIdentity,false);
assert.equal(e.decision.thresholdEUR,null);
assert.equal(e.decision.stakeEUR,0);
assert.equal(e.decision.realMoneyAllowed,false);
assert.equal(e.hardGuards.classicMustNeverInheritWagerBetWithoutIndependentBinding,true);
assert.equal(e.hardGuards.executionContractRemainsSoleGreenAuthority,true);

const classic=p.priority.find(x=>x.id==='classic-video-poker-progressive-discovery');
assert.ok(classic);
assert.equal(classic.rank,5);
assert.equal(classic.thresholdNow,null);
assert.equal(classic.executionEligible,false);
assert.equal(classic.mustNotInheritFeedId,'generic:WAGER_BET');
assert.equal(p.hardGuards.classicVideoPokerCannotInheritUltimateWagerBetBinding,true);
assert.equal(p.realMoneyAllowed,false);

console.log('edge-classic-video-poker-progressive-claim-v1.test.mjs: PASS');
