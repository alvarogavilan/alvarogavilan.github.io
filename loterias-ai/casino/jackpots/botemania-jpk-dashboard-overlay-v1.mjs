#!/usr/bin/env node
import fs from 'node:fs';
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const DASH='loterias-ai/casino/evidence/casino-dashboard-v1.json';
const GATE='loterias-ai/casino/jackpots/evidence/botemania-jpk-live-gate-v1.json';
const FLOW='loterias-ai/casino/jackpots/evidence/botemania-jpk-flow-model-v1.json';
const CANAL='loterias-ai/casino/jackpots/evidence/botemania-canalbingo-crosscheck-v1.json';
const d=read(DASH), g=read(GATE)||{}, f=read(FLOW)||{}, c=read(CANAL)||{};
if(!d) throw new Error('casino dashboard missing');
const radar=d.economics?.mechanismRadar?.botemaniaJackpotKing||{};
const overlay={
  ...radar,
  liveGateState:g.state||'NO_DATA',
  liveGateReason:g.decision?.reason||null,
  observedAt:g.current?.observedAt||null,
  currentPotsEUR:g.current?.potsEUR||radar.currentLabeledPots||{},
  normalizedSeedToCapHypothesis:g.current?.normalizedSeedToCapHypothesis||{},
  researchBand:g.researchBand||null,
  exactSpainMbwbKnown:g.evidence?.exactSpainMbwbKnown===true,
  exactHazardKnown:g.evidence?.exactHazardKnown===true,
  cleanResets:Number(g.evidence?.cleanResets||0),
  canalBingoSharedPotCorroborated:g.evidence?.canalBingoSharedPotCorroborated===true,
  canalBingoResolvedVenture:g.evidence?.canalBingoResolvedVenture||null,
  inferredNetworkEconomics:{
    observationsUsed:Number(f.observationsUsed||0),
    cleanGrowthIntervals:Number(f.cleanGrowthIntervals||0),
    impliedNetworkStakeEUR:Number(f.aggregate?.impliedNetworkStakeEUR||0),
    allocationShares:f.aggregate?.allocationShares||null
  },
  economicPromotionCandidate:g.decision?.economicPromotionCandidate===true,
  realMoneyAllowed:false,
  automaticBettingAllowed:false
};
d.economics=d.economics||{};d.economics.mechanismRadar=d.economics.mechanismRadar||{};d.economics.progressiveNetworks=d.economics.progressiveNetworks||{};
d.economics.mechanismRadar.botemaniaJackpotKing=overlay;
d.economics.progressiveNetworks.botemaniaJackpotKing=overlay;
d.generatedAt=new Date().toISOString();
fs.writeFileSync(DASH,JSON.stringify(d,null,2)+'\n');
console.log(JSON.stringify({liveGateState:overlay.liveGateState,liveGateReason:overlay.liveGateReason,currentPotsEUR:overlay.currentPotsEUR,researchBand:overlay.researchBand,canalBingoSharedPotCorroborated:overlay.canalBingoSharedPotCorroborated,realMoneyAllowed:false},null,2));
