#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const FREEZE='loterias-ai/casino/playuzu/evidence/progressive-network-priority-freeze-v1.json';
const DISC='loterias-ai/casino/playuzu/evidence/shared-jackpot-networks-v1.json';
const OUT='loterias-ai/casino/playuzu/evidence/progressive-network-priority-v1.json';
const freeze=JSON.parse(fs.readFileSync(FREEZE,'utf8')),disc=JSON.parse(fs.readFileSync(DISC,'utf8'));
if(freeze.version!=='progressive-network-priority-freeze-v1'||freeze.immutable!==true||freeze.guards?.selectionIndependentOfFutureNetworkBehavior!==true||freeze.guards?.realMoneyAllowed!==false)throw new Error('priority freeze drift');
if(disc.version!=='shared-jackpot-networks-v1'||disc.generatedAt!==freeze.discoverySnapshotGeneratedAt)throw new Error('discovery snapshot drift');
const rows=(disc.sharedNetworks||[]).map(n=>{
 const titles=(n.titles||[]).filter(t=>Number.isFinite(Number(t.rtpMaxPct)));
 const sorted=[...titles].sort((a,b)=>Number(b.rtpMaxPct)-Number(a.rtpMaxPct)||String(a.name).localeCompare(String(b.name)));
 const top=sorted[0]||null;
 return {networkId:n.networkId,distinctTitles:Number(n.distinctTitles||0),providers:n.providers||[],pages:n.pages||[],maxRtpPct:top?Number(top.rtpMaxPct):null,topRtpTitle:top?.name??null,topRtpInternalGameId:top?.internalGameId??null,topRtpProvider:top?.provider??null,rawCounterAtDiscovery:n.rawCounter,reportedCurrencies:n.reportedCurrencies||[],eligible:Number(n.distinctTitles)>=Number(freeze.eligibility.minimumDistinctTitles)&&Boolean(top)};
}).filter(x=>x.eligible).sort((a,b)=>b.maxRtpPct-a.maxRtpPct||b.distinctTitles-a.distinctTitles||String(a.networkId).localeCompare(String(b.networkId)));
const selected=rows.slice(0,Number(freeze.selectedCount||3)).map((x,i)=>({...x,priority:i+1,selectionBasis:'STATIC_BASE_RTP_ONLY'}));
const payload={version:'progressive-network-priority-v1',generatedAt:new Date().toISOString(),freezeVersion:freeze.version,discoverySnapshotSha256:crypto.createHash('sha256').update(fs.readFileSync(DISC)).digest('hex'),summary:{eligibleNetworks:rows.length,selectedNetworks:selected.length,highestBaseRtpPct:selected[0]?.maxRtpPct??null},selected,allRanked:rows,interpretation:{priorityIsNotEvidence:true,counterMagnitudeNotUsed:true,futureGrowthNotUsed:true,positiveEVKnown:false},guards:{selectionRuleFrozenBeforeFutureObservation:true,noFutureBehaviorUsed:true,noEconomicPromotion:true,noBetting:true,realMoneyAllowed:false}};
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify({summary:payload.summary,selected},null,2));
