import assert from 'node:assert/strict';
import {analyzeEdgeP0HarText} from '../scripts/analyze-edge-p0-har.mjs';

const raw=JSON.stringify({log:{entries:[]}});
const lanes=['apmccoy','casino777-aotgn','frank','ultimate-vp','kingdoms-rise','betfair-regal-riches','magic-nile','scarab','hexbreak3r','golden-egypt','ocean-magic'];
for(const lane of lanes){
  const out=analyzeEdgeP0HarText(raw,{lane,sourceName:`${lane}.har`});
  assert.equal(out.ok,true,`${lane} should route through the unified offline dispatcher`);
  assert.equal(out.execution.decision,'NO_PLAY');
  assert.equal(out.execution.realMoneyAllowed,false);
  assert.equal(out.hardGuards.offlineOnly,true);
  assert.equal(out.hardGuards.passiveHarOnly,true);
  assert.equal(out.hardGuards.noNetwork,true);
  assert.equal(out.hardGuards.noWagerProbe,true);
  assert.equal(out.hardGuards.reviewCandidatesCannotSelfApprove,true);
  assert.equal(out.hardGuards.laneSpecificSummaryRequired,true);
  assert.equal(out.hardGuards.crossLaneGateTransferForbidden,true);
}
const bad=analyzeEdgeP0HarText(raw,{lane:'regal-riches',sourceName:'ambiguous-enracha-regal.har'});
assert.equal(bad.ok,false);
assert.equal(bad.reason,'SUPPORTED_LANE_REQUIRED');
assert.deepEqual(bad.supportedLanes,lanes);

const entry=(url,text,mimeType='text/plain')=>({request:{url,headers:[]},response:{status:200,content:{mimeType,text}}});
const betfairLauncher=gameId=>`https://launcher.betfair.es/?RPBucket=casino&dataChannel=casino&gameId=${gameId}&launchProduct=casino&mode=real`;

const aotgn=analyzeEdgeP0HarText(JSON.stringify({log:{entries:[
  entry('https://www.casino777.es/age-of-the-gods-norse-king-of-asgard','Age of the Gods Norse King of Asgard Playtech'),
  entry('https://ticker.example/new_jackpotxml.php?info=1&casino=c777_es&game=aognjp-2&currency=eur&ssoid=PRIVATE','<request><gamedata timestamp="1788012001" local="0" winc="7" gamegroup="aognjp" game="aognjp-2"><amount-list><amount currency="eur" guaranteedHitTime="1788050000">1500.00</amount></amount-list></gamedata><gamedata timestamp="1788012001" local="0" winc="9" gamegroup="aognjp" game="aognjp-3"><amount-list><amount currency="eur" guranteedHitAmount="2000.00">1988.50</amount></amount-list></gamedata></request>')
]}}),{lane:'casino777-aotgn',sourceName:'aotgn.har'});
assert.equal(aotgn.closed.exactTargetPageObserved,true);
assert.equal(aotgn.closed.eurGlobalAognjpRowsObserved,true);
assert.equal(aotgn.closed.dailyTimedRowObserved,true);
assert.equal(aotgn.closed.amountMhbRowObserved,true);
assert.equal(aotgn.closed.exactTickerSessionCandidate,true);
assert.equal(aotgn.closed.dailySemanticBindingCandidate,true);
assert.equal(aotgn.closed.amountMhbFamilyBindingCandidate,true);
assert.equal(aotgn.closed.exactExtraVsInstantIdentityVerified,false);
assert.equal(aotgn.closed.executionAuthorized,false);
assert.equal(aotgn.hardGuards.casino777AotgnCrossOperatorImsCannotSelfBind,true);
assert.equal(aotgn.hardGuards.casino777AotgnAmountBoundaryCannotDistinguishExtraInstant,true);
assert.equal(JSON.stringify(aotgn).includes('PRIVATE'),false);

const kingdoms=analyzeEdgeP0HarText(JSON.stringify({log:{entries:[
  entry(betfairLauncher('kingdom-rise-sands-of-fury-cptn'),'launcher'),
  entry('https://ticker.example/new_jackpotxml.php?info=1&casino=bf_es&game=krjp-2&currency=eur&ssoid=PRIVATE','<request><gamedata timestamp="1788012001" local="0" winc="12" gamegroup="krjp" game="krjp-2"><amount-list><amount currency="eur" guranteedHitAmount="2000.00">1990.25</amount></amount-list></gamedata></request>')
]}}),{lane:'kingdoms-rise',sourceName:'kingdoms.har'});
assert.equal(kingdoms.closed.exactTargetLauncherObserved,true);
assert.equal(kingdoms.closed.eurGlobalKrjpRowsObserved,true);
assert.equal(kingdoms.closed.guaranteedAmountRowObserved,true);
assert.equal(kingdoms.closed.powerStrikeSemanticBindingCandidate,true);
assert.equal(kingdoms.closed.amountBoundaryCaptureCandidate,true);
assert.equal(kingdoms.closed.amountBoundaryPromotionAllowed,false);
assert.equal(kingdoms.hardGuards.kingdomsRiseTierCodesCannotSelfBind,true);
assert.equal(JSON.stringify(kingdoms).includes('PRIVATE'),false);

const regal=analyzeEdgeP0HarText(JSON.stringify({log:{entries:[entry(betfairLauncher('regal-riches-aig'),'launcher'),entry('https://game.example/help','Regal Riches IGT Progressive Wild purple meter green meter yellow meter persistent bet level RTP')]}}),{lane:'betfair-regal-riches',sourceName:'regal.har'});
assert.equal(regal.closed.exactTargetLauncherObserved,true);assert.equal(regal.closed.providerIgtReviewCandidateObserved,true);assert.equal(regal.closed.persistentStateReviewCandidateObserved,true);assert.equal(regal.closed.stateSpecificEvVerified,false);

const magic=analyzeEdgeP0HarText(JSON.stringify({log:{entries:[entry(betfairLauncher('magic-of-nile-aig'),'launcher'),entry('https://game.example/help','Magic of the Nile IGT obelisks gems red blue green persistent per bet level RTP 96.02')]}}),{lane:'magic-nile',sourceName:'magic.har'});
assert.equal(magic.closed.exactTargetLauncherObserved,true);assert.equal(magic.closed.gemStateReviewCandidateObserved,true);assert.equal(magic.closed.stateSpecificEvVerified,false);

const scarab=analyzeEdgeP0HarText(JSON.stringify({log:{entries:[entry(betfairLauncher('scarab-aig'),'launcher'),entry('https://game.example/help','Scarab IGT 10-spin cycle gold border persistent state denomination bet level')]}}),{lane:'scarab',sourceName:'scarab.har'});
assert.equal(scarab.closed.exactTargetLauncherObserved,true);assert.equal(scarab.closed.cycleStateReviewCandidateObserved,true);assert.equal(scarab.closed.currentStatePositiveEvVerified,false);

const hex=analyzeEdgeP0HarText(JSON.stringify({log:{entries:[entry(betfairLauncher('hexbreak3r-aig'),'launcher'),entry('https://game.example/help','Hexbreak3r IGT expanding reel horseshoe Luck Zone progressive reel 3 persistent per bet level RTP')]}}),{lane:'hexbreak3r',sourceName:'hex.har'});
assert.equal(hex.closed.exactTargetLauncherObserved,true);assert.equal(hex.closed.exactSpainGameIdPubliclyVerified,true);assert.equal(hex.closed.reelStateReviewCandidateObserved,true);assert.equal(hex.closed.stateSpecificEvVerified,false);

const goldenLauncher='https://launcher.betfair.es/?RPBucket=arcade&dataChannel=arcade&gameId=golden-egypt-aem&launchProduct=arcade&mode=real';
const golden=analyzeEdgeP0HarText(JSON.stringify({log:{entries:[entry(goldenLauncher,'launcher'),entry('https://game.example/help','Golden Egypt IGT Wild Stays 2 Plays two Coins same reel Wild next two spins RTP')]}}),{lane:'golden-egypt',sourceName:'golden.har'});
assert.equal(golden.closed.exactTargetLauncherObserved,true);assert.equal(golden.closed.providerIgtReviewCandidateObserved,true);assert.equal(golden.closed.igtWildStaysMechanicReviewCandidateObserved,true);assert.equal(golden.closed.exactSpainProviderVerified,false);assert.equal(golden.closed.stateSpecificEvVerified,false);

const ocean=analyzeEdgeP0HarText(JSON.stringify({log:{entries:[entry('https://www.enracha.es/juegos/ocean-magic','Ocean Magic'),entry('https://games.example/config','Ocean Magic IGT RTP 92.18 minimum 0.50 maximum 250'),entry('https://games.example/help','Ocean Magic IGT bubble positions remain persistent per bet level')]}}),{lane:'ocean-magic',sourceName:'ocean.har'});
assert.equal(ocean.closed.exactTargetSessionObserved,true);assert.equal(ocean.closed.configurationCandidateObserved,true);assert.equal(ocean.closed.persistentStateCandidateObserved,true);assert.equal(ocean.closed.crossPlayerPersistenceVerified,false);

for(const out of [aotgn,kingdoms,regal,magic,scarab,hex,golden,ocean]){assert.equal(out.execution.decision,'NO_PLAY');assert.equal(out.execution.realMoneyAllowed,false);}
console.log('analyze-edge-p0-har-v1.test.mjs PASS');
