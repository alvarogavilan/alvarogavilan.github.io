#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const CAT='loterias-ai/casino/playuzu/evidence/validated-game-catalog-v1.json';
const OUT='loterias-ai/casino/playuzu/evidence/age-of-gods-network-probe-v1.json';
const cat=JSON.parse(fs.readFileSync(CAT,'utf8'));
const category=(cat.categories||[]).find(x=>String(x.category)==='jackpot'&&x.backendPath);
if(!category) throw new Error('validated jackpot backend path missing');
const appName='PlayUZU.es';
const rows=[]; const pages=[];
for(let page=1;page<=Math.max(1,Number(category.lastPage||1));page++){
  const url=`${category.backendPath}?page=${page}&appName=${encodeURIComponent(appName)}`;
  const r=await fetch(url,{headers:{accept:'application/json','user-agent':'loterias-ai-playuzu-aotg-network/1.0','referer':'https://www.playuzu.es/jackpots/','origin':'https://www.playuzu.es'}});
  const text=await r.text(); let json=null; try{json=JSON.parse(text)}catch{}
  const data=Array.isArray(json?.data)?json.data:[];
  pages.push({page,url,httpStatus:r.status,itemCount:data.length,bodySha256:crypto.createHash('sha256').update(text).digest('hex')});
  if(!r.ok) throw new Error(`PlayUZU jackpot backend HTTP ${r.status}`);
  for(const g of data){
    const name=String(g.application_name||g.item_title||'');
    if(!/(age of the gods|aotg)/i.test(name)) continue;
    rows.push({
      name,
      internalGameId:g.internal_game_id??null,
      externalGameId:g.external_game_id??null,
      provider:g.game_provider??null,
      studio:g.studio??null,
      rtpMinPct:Number.isFinite(Number(g.rtp_min))?Number(g.rtp_min):null,
      rtpMaxPct:Number.isFinite(Number(g.rtp_max))?Number(g.rtp_max):null,
      jackpotFlag:g.is_jackpot===true,
      jackpotKingFlag:g.is_jackpot_king===true,
      jackpotAmountObject:g.jackpot??null,
      jackpotAmountField:g.jackpot_amount??null,
      dailyJackpot:g.daily_jackpot??null,
      internalRewardFieldPct:Number.isFinite(Number(g.ojo_plus_percent))?Number(g.ojo_plus_percent):null,
      minBet:g.min_bet??null,
      maxBet:g.max_bet??null,
      infoLabel:g.info_label??null
    });
  }
}
const numericJackpots=[];
for(const r of rows){
  for(const candidate of [r.jackpotAmountObject?.amount,r.jackpotAmountField]){
    const n=Number(candidate);
    if(Number.isFinite(n)&&n>0) numericJackpots.push({name:r.name,value:n});
  }
}
const buckets=new Map();
for(const x of numericJackpots){const k=x.value.toFixed(2),b=buckets.get(k)||{value:x.value,titles:new Set()};b.titles.add(x.name);buckets.set(k,b);}
const corroborated=[...buckets.values()].map(x=>({value:x.value,distinctTitles:x.titles.size,titles:[...x.titles]})).sort((a,b)=>b.distinctTitles-a.distinctTitles||b.value-a.value);
const payload={
  version:'playuzu-age-of-gods-network-probe-v1',
  generatedAt:new Date().toISOString(),
  sourcePage:'https://www.playuzu.es/jackpots/',
  appName,
  backendPath:category.backendPath,
  summary:{pages:pages.length,http200Pages:pages.filter(x=>x.httpStatus===200).length,ageGames:rows.length,ageGamesWithPositiveJackpotField:rows.filter(r=>Number(r.jackpotAmountObject?.amount)>0||Number(r.jackpotAmountField)>0).length,sharedPositiveJackpotValues:corroborated.filter(x=>x.distinctTitles>=2).length},
  corroboratedJackpotValues:corroborated,
  games:rows,
  pages,
  interpretation:{positiveEVKnown:false,reason:'Structured official PlayUZU Spain jackpot fields are observational evidence only. Shared values may identify a network but do not establish contribution, trigger odds or positive EV.'},
  guards:{officialPlayUZUSpainBackendOnly:true,exactObservedAppNameOnly:true,noLoginBypass:true,noBetting:true,noEconomicPromotionFromPotAlone:true,realMoneyAllowed:false}
};
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');
console.log(JSON.stringify({summary:payload.summary,corroborated:payload.corroboratedJackpotValues.slice(0,5)},null,2));
