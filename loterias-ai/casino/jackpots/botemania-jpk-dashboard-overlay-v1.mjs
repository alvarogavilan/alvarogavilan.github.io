#!/usr/bin/env node
import fs from 'node:fs';
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const DASH='loterias-ai/casino/evidence/casino-dashboard-v1.json';
const GATE='loterias-ai/casino/jackpots/evidence/botemania-jpk-live-gate-v1.json';
const FLOW='loterias-ai/casino/jackpots/evidence/botemania-jpk-flow-model-v1.json';
const CANAL='loterias-ai/casino/jackpots/evidence/botemania-canalbingo-crosscheck-v1.json';
const PROTOCOL='loterias-ai/casino/jackpots/evidence/botemania-jpk-prospective-protocol-status-v1.json';
const d=read(DASH), g=read(GATE)||{}, f=read(FLOW)||{}, c=read(CANAL)||{}, p=read(PROTOCOL)||{};
if(!d) throw new Error('casino dashboard missing');
const radar=d.economics?.mechanismRadar?.botemaniaJackpotKing||{};
const overlay={
  ...radar,
  liveGateState:g.state||'NO_DATA',
  liveGateReason:g.decision?.reason||null,
  observedAt:g.current?.observedAt||null,
  currentPotsEUR:g.current?.potsEUR||radar.currentLabeledPots||{},
  normalizedSeedToCapHypothesis:g.current?.normalizedSeedToCapHypothesis||{},
  modelScreen:g.current?.modelScreen||null,
  researchBand:g.researchBand||null,
  exactSpainMbwbKnown:g.evidence?.exactSpainMbwbKnown===true,
  exactHazardKnown:g.evidence?.exactHazardKnown===true,
  hazardFitReady:g.evidence?.hazardFitReady===true,
  cleanResets:Number(g.evidence?.cleanResets||0),
  prospectiveProtocol:{
    frozenAt:p.protocolFrozenAt||null,
    phase:p.status?.phase||'DISCOVERY',
    phaseProgress:p.status?.phaseProgress||null,
    cleanProspectiveResetWindows:Number(p.status?.cleanProspectiveResetWindows||0),
    discoveryTarget:Number(p.status?.discoveryTarget||10),
    validationTarget:Number(p.status?.validationTarget||10),
    economicReplicationTarget:Number(p.status?.economicReplicationTarget||20),
    mbwbHypothesisFalsified:p.mbwbHypothesis?.falsified===true,
    falsifications:p.mbwbHypothesis?.falsifications||[]
  },
  canalBingoSharedPotCorroborated:g.evidence?.canalBingoSharedPotCorroborated===true,
  canalBingoResolvedVenture:g.evidence?.canalBingoResolvedVenture||null,
  observedNetworkFlow:{
    observationsUsed:Number(f.observationsUsed||0),
    cleanGrowthIntervals:Number(f.cleanGrowthIntervals||0),
    activePotGrowthEUR:Number(f.aggregate?.activePotGrowthEUR||0),
    allocationShares:f.aggregate?.allocationShares||null,
    fishinFrenzyStakeEquivalentEUR:Number(f.aggregate?.fishinFrenzyStakeEquivalentEUR||0),
    networkStakeEUR:null,
    networkStakeIdentifiableFromPotGrowthAlone:false,
    mixedNetworkContributionRates:true,
    note:f.aggregate?.note||'Do not infer total network wagering from a single game contribution rate.'
  },
  correction:{priorImpliedNetworkStakeMetricWithdrawn:f.corrections?.priorImpliedNetworkStakeFieldWithdrawn===true},
  economicPromotionCandidate:g.decision?.economicPromotionCandidate===true,
  realMoneyAllowed:false,
  automaticBettingAllowed:false
};
d.economics=d.economics||{};d.economics.mechanismRadar=d.economics.mechanismRadar||{};d.economics.progressiveNetworks=d.economics.progressiveNetworks||{};
d.economics.mechanismRadar.botemaniaJackpotKing=overlay;
d.economics.progressiveNetworks.botemaniaJackpotKing=overlay;
d.generatedAt=new Date().toISOString();
fs.writeFileSync(DASH,JSON.stringify(d,null,2)+'\n');
console.log(JSON.stringify({liveGateState:overlay.liveGateState,liveGateReason:overlay.liveGateReason,currentPotsEUR:overlay.currentPotsEUR,researchBand:overlay.researchBand,prospectiveProtocol:overlay.prospectiveProtocol,correction:overlay.correction,realMoneyAllowed:false},null,2));
