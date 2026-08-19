#!/usr/bin/env node
import fs from 'node:fs';
const SRC='loterias-ai/casino/playuzu/evidence/shared-jackpot-networks-v1.json';
const OUT='loterias-ai/casino/playuzu/evidence/shared-jackpot-networks-summary-v1.json';
const j=JSON.parse(fs.readFileSync(SRC,'utf8'));
const networks=(j.sharedNetworks||[]).map((n,i)=>{
  const titles=n.titles||[];
  const rtp=titles.map(x=>Number(x.rtpMaxPct)).filter(Number.isFinite);
  return {rank:i+1,networkId:n.networkId,rawCounter:n.rawCounter,distinctTitles:n.distinctTitles,providers:n.providers||[],reportedCurrencies:n.reportedCurrencies||[],pages:n.pages||[],rtpMaxPct:rtp.length?Math.max(...rtp):null,rtpMinPct:rtp.length?Math.min(...rtp):null,representativeTitles:titles.slice(0,8).map(x=>({name:x.name,provider:x.provider,rtpMaxPct:x.rtpMaxPct,page:x.page}))};
});
const recommended=networks.filter(n=>n.distinctTitles>=2).map(n=>({...n,observationEligible:true,reason:'STRUCTURAL_SHARED_COUNTER_ONLY'}));
const out={version:'shared-jackpot-networks-summary-v1',generatedAt:new Date().toISOString(),source:SRC,summary:j.summary,networks,recommendedForObservation:recommended,policy:{selectionUsesCurrentStructuralSnapshotOnly:true,futureGrowthNotUsedForSelection:true,currencyTrusted:false,counterSizeAloneCannotImplyEV:true,observationProtocol:'progressive-network-observation-protocol-v1'},guards:{noBetting:true,realMoneyAllowed:false}};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({summary:out.summary,networks:networks.map(n=>({rank:n.rank,rawCounter:n.rawCounter,titles:n.distinctTitles,providers:n.providers,rtpMaxPct:n.rtpMaxPct,currencies:n.reportedCurrencies}))},null,2));