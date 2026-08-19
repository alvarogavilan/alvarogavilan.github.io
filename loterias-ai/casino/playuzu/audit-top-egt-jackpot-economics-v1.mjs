#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const CAT='loterias-ai/casino/playuzu/evidence/validated-game-catalog-v1.json';
const OUT='loterias-ai/casino/playuzu/evidence/top-egt-jackpot-economics-v1.json';
const cat=JSON.parse(fs.readFileSync(CAT,'utf8'));
const category=(cat.categories||[]).find(x=>String(x.category)==='jackpot'&&x.backendPath);
if(!category)throw new Error('validated jackpot backend missing');
const appName='PlayUZU.es';
const rows=[];const pages=[];
for(let page=1;page<=Math.max(1,Number(category.lastPage||1));page++){
 const url=`${category.backendPath}?page=${page}&appName=${encodeURIComponent(appName)}`;
 const r=await fetch(url,{headers:{accept:'application/json','user-agent':'loterias-ai-top-egt-economics/1.0','referer':'https://www.playuzu.es/jackpots/','origin':'https://www.playuzu.es'}});
 const text=await r.text();let j=null;try{j=JSON.parse(text)}catch{}
 const data=Array.isArray(j?.data)?j.data:[];
 pages.push({page,httpStatus:r.status,itemCount:data.length,bodySha256:crypto.createHash('sha256').update(text).digest('hex')});
 if(!r.ok)throw new Error(`jackpot backend HTTP ${r.status}`);
 for(const g of data){
   if(!/^(EGT|Amusnet)$/i.test(String(g.game_provider||'')))continue;
   const rtp=Number(g.rtp_max);
   if(!Number.isFinite(rtp)||rtp<97)continue;
   const all={};for(const [k,v] of Object.entries(g))if(/bet|stake|rtp|jackpot|contrib|percent|reward|plus|provider|game_id|application_name|currency|eligible|qualif/i.test(k))all[k]=v;
   rows.push({name:g.application_name||g.item_title||null,internalGameId:g.internal_game_id??null,externalGameId:g.external_game_id??null,provider:g.game_provider??null,rtpMinPct:Number(g.rtp_min),rtpMaxPct:rtp,minBet:g.min_bet??null,maxBet:g.max_bet??null,jackpot:g.jackpot??null,jackpotAmount:g.jackpot_amount??null,isJackpot:g.is_jackpot===true,isJackpotKing:g.is_jackpot_king===true,internalRewardFlag:g.ojo_plus??null,internalRewardFieldPct:g.ojo_plus_percent??null,allEconomicFields:all,page});
 }
}
const dedup=[...new Map(rows.map(x=>[x.internalGameId,x])).values()].sort((a,b)=>b.rtpMaxPct-a.rtpMaxPct||String(a.name).localeCompare(String(b.name)));
const keys=[...new Set(dedup.flatMap(r=>Object.keys(r.allEconomicFields||{})))].sort();
const explicitContributionFields=keys.filter(k=>/contrib|jackpot.*percent|jackpot.*rate|progressive.*rate|pool.*rate/i.test(k));
const explicitEligibilityFields=keys.filter(k=>/eligible|qualif|jackpot.*min|min.*jackpot/i.test(k));
const payload={version:'top-egt-jackpot-economics-v1',generatedAt:new Date().toISOString(),sourcePage:'https://www.playuzu.es/jackpots/',appName,backendPath:category.backendPath,summary:{games:dedup.length,rtp97OrHigher:dedup.filter(x=>x.rtpMaxPct>=97).length,withMinBet:dedup.filter(x=>x.minBet!=null).length,withPositiveJackpotCounter:dedup.filter(x=>Number(x.jackpot?.amount)>0||Number(x.jackpotAmount)>0).length,explicitContributionFields,explicitEligibilityFields},games:dedup,pages,interpretation:{baseRtpKnown:true,jackpotEligibilityThresholdKnownFromBackend:false,progressiveContributionKnownFromBackend:explicitContributionFields.length>0,triggerProbabilityKnownFromBackend:false,positiveEVKnown:false},guards:{officialPlayUZUSpainBackendOnly:true,exactObservedAppNameOnly:true,noLoginBypass:true,noFutureInformation:true,noBetting:true,noEconomicPromotionFromIncompleteMechanics:true,realMoneyAllowed:false}};
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify({summary:payload.summary,games:dedup.map(x=>({name:x.name,rtp:x.rtpMaxPct,minBet:x.minBet,maxBet:x.maxBet,rawJackpot:x.jackpot?.amount??x.jackpotAmount}))},null,2));