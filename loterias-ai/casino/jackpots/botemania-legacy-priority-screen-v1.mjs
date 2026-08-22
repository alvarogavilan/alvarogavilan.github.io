#!/usr/bin/env node
import fs from 'node:fs';

const livePath='loterias-ai/edge-live/evidence/botemania-all-network-live-state-v1.json';
const comparatorPath='loterias-ai/casino/jackpots/evidence/legacy-global-comparator-stats-v1.json';
const outPath='loterias-ai/casino/jackpots/evidence/botemania-legacy-priority-screen-v1.json';

export function buildLegacyPriorityScreen(live,comparators,nowIso=new Date().toISOString()){
  const now=Date.parse(nowIso);
  const observed=Date.parse(live?.observedAt||live?.generatedAt||'');
  const ageMinutes=Number.isFinite(now)&&Number.isFinite(observed)?(now-observed)/60000:null;
  const fresh=Number.isFinite(ageMinutes)&&ageMinutes>=0&&ageMinutes<=30;
  const byKey=live?.currentByKey||{};
  const rows=[];
  for(const c of comparators.sources||[]){
    const amountEUR=byKey[c.feedKey]?.amountEUR??null;
    const row={
      feedKey:c.feedKey,
      currentSpainTitle:c.currentSpainTitle,
      observedAt:live?.observedAt||null,
      amountEUR,
      fresh,
      ageMinutes:Number.isFinite(ageMinutes)?+ageMinutes.toFixed(2):null,
      comparatorSourceUrl:c.sourceUrl,
      historicalWinsRecorded:c.historicalWinsRecorded??null,
      currentSpainPublishedRTP:c.currentSpainPublishedRTP??null,
      currentSpainPublishedBaseRTP:c.currentSpainPublishedBaseRTP??null,
      currentSpainPublishedJackpotContribution:c.currentSpainPublishedJackpotContribution??null,
      crossMarketExecutionAllowed:false,
      realMoneyAllowed:false,
      stakeEUR:0
    };
    if(Number.isFinite(amountEUR)&&Number.isFinite(c.historicalAverageWinGBP)){
      row.nominalVsHistoricalAverageRatio=+(amountEUR/c.historicalAverageWinGBP).toFixed(4);
    }
    if(Number.isFinite(amountEUR)&&Number.isFinite(c.historicalBreakEvenGBP)){
      row.nominalVsHistoricalBreakEvenRatio=+(amountEUR/c.historicalBreakEvenGBP).toFixed(4);
    }
    if(Number.isFinite(c.currentSpainPublishedBaseRTP)){
      row.baseRtpGapTo100=+(1-c.currentSpainPublishedBaseRTP).toFixed(6);
    }
    if(Number.isFinite(c.currentSpainPublishedJackpotContribution)&&c.currentSpainPublishedJackpotContribution>0&&Number.isFinite(row.baseRtpGapTo100)){
      row.requiredJackpotUpliftVsPublishedContribution=+(row.baseRtpGapTo100/c.currentSpainPublishedJackpotContribution).toFixed(2);
    }
    if(c.feedKey==='generic:diamondbonanza25BTM'){
      row.discoveryPriority='PRIORITY_1_DIAMOND_RECAPTURE_AND_SPAIN_TRIGGER_PROBABILITY';
      row.reason='Exact Spain lineage/RTP/coin values are known and the last observed meter was numerically above the historical 25p average; discovery ranking only because currency/configuration differ.';
    }else if(c.feedKey==='generic:WAGER_BET'){
      row.discoveryPriority='PRIORITY_2_UVP_EXACT_SPAIN_PAYTABLE_TRIGGER';
      row.reason='Exact optimizer exists, but current Spain paytable/trigger/counter binding remain unverified; historical break-even is comparator-only.';
    }else if(c.feedKey==='generic:tikitemple2_1'){
      row.discoveryPriority='PRIORITY_3_TIKI_POST_RESET_MONITOR';
      row.reason='Lineage is strong but coin tier/economics differ and the last observed Spain meter was near reset.';
    }else if(c.feedKey==='generic:bouncy_bubbles_id'){
      row.discoveryPriority='PRIORITY_4_BURBUJAS_SHARED_TIER_BINDING';
      row.reason='Current Spain lineage and economics are known, but exact shared-tier binding/win probability are not. The base RTP gap is large relative to the published jackpot contribution, so it ranks below Diamond until a much stronger meter/trigger model exists.';
    }else{
      row.discoveryPriority='UNRANKED';
    }
    row.action=fresh?'USE_FOR_DISCOVERY_SCREEN_ONLY':'RECAPTURE_REQUIRED_BEFORE_ANY_CURRENT_STATE_CLAIM';
    rows.push(row);
  }
  return{
    version:'botemania-legacy-priority-screen-v1.1',
    generatedAt:nowIso,
    sourceObservedAt:live?.observedAt||null,
    sourceFresh:fresh,
    sourceAgeMinutes:Number.isFinite(ageMinutes)?+ageMinutes.toFixed(2):null,
    ranked:rows.sort((a,b)=>String(a.discoveryPriority).localeCompare(String(b.discoveryPriority))),
    guards:{
      nominalCrossMarketRatiosAreDiscoveryOnly:true,
      noCurrencyParityAssumption:true,
      noHistoricalEconomicsPromotion:true,
      jackpotContributionIsNotWinProbability:true,
      staleMetersCannotTriggerPlay:true,
      exactSpainEVStillRequired:true,
      realMoneyAllowed:false,
      stakeEUR:0
    }
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const live=JSON.parse(fs.readFileSync(livePath,'utf8'));
  const comparators=JSON.parse(fs.readFileSync(comparatorPath,'utf8'));
  const out=buildLegacyPriorityScreen(live,comparators);
  fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
  fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
  console.log(JSON.stringify({sourceFresh:out.sourceFresh,sourceAgeMinutes:out.sourceAgeMinutes,ranked:out.ranked.map(x=>({feedKey:x.feedKey,amountEUR:x.amountEUR,priority:x.discoveryPriority,action:x.action,avgRatio:x.nominalVsHistoricalAverageRatio,breakEvenRatio:x.nominalVsHistoricalBreakEvenRatio,requiredJackpotUplift:x.requiredJackpotUpliftVsPublishedContribution})),guards:out.guards},null,2));
}
