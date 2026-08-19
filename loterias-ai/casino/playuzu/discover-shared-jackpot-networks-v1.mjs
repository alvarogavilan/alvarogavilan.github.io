#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const APP='PlayUZU.es';
const BASE='https://games-api.netdnstrace1.com/v2/categories/jackpot';
const OUT='loterias-ai/casino/playuzu/evidence/shared-jackpot-networks-v1.json';
const pages=[],games=[];
for(let p=1;p<=25;p++){
  const url=`${BASE}?page=${p}&appName=${encodeURIComponent(APP)}`;
  const r=await fetch(url,{headers:{accept:'application/json','user-agent':'loterias-ai-shared-jackpot-network-discovery/1.0','referer':'https://www.playuzu.es/jackpots/','origin':'https://www.playuzu.es','cache-control':'no-cache, no-store'}});
  const text=await r.text();let j=null;try{j=JSON.parse(text)}catch{}
  const items=Array.isArray(j?.data)?j.data:[];
  pages.push({page:p,url,httpStatus:r.status,itemCount:items.length,bodySha256:crypto.createHash('sha256').update(text).digest('hex')});
  if(!r.ok||!items.length)break;
  for(const g of items){
    const amount=Number(g?.jackpot?.amount);
    if(!Number.isFinite(amount)||amount<=0)continue;
    games.push({name:g.application_name??g.item_title??null,internalGameId:g.internal_game_id??null,externalGameId:g.external_game_id??null,provider:g.game_provider??null,studio:g.studio??null,rtpMaxPct:Number.isFinite(Number(g.rtp_max))?Number(g.rtp_max):null,rawJackpotCounter:amount,reportedCurrency:g?.jackpot?.currency??null,reportedSymbol:g?.jackpot?.symbol??null,isJackpot:g.is_jackpot??false,isJackpotKing:g.is_jackpot_king??false,dailyJackpot:g.daily_jackpot??false,page:p});
  }
}
const byValue=new Map();
for(const g of games){const k=g.rawJackpotCounter.toFixed(6);const a=byValue.get(k)||[];a.push(g);byValue.set(k,a);}
const networks=[...byValue.entries()].map(([k,rows])=>({networkId:'raw-'+crypto.createHash('sha256').update(k).digest('hex').slice(0,12),rawCounter:Number(k),distinctTitles:new Set(rows.map(x=>x.name)).size,reportedCurrencies:[...new Set(rows.map(x=>x.reportedCurrency).filter(Boolean))],reportedSymbols:[...new Set(rows.map(x=>x.reportedSymbol).filter(Boolean))],providers:[...new Set(rows.map(x=>x.provider).filter(Boolean))],pages:[...new Set(rows.map(x=>x.page))],titles:rows.sort((a,b)=>String(a.name).localeCompare(String(b.name),'es'))})).sort((a,b)=>b.distinctTitles-a.distinctTitles||b.rawCounter-a.rawCounter);
const shared=networks.filter(x=>x.distinctTitles>=2);
const out={version:'shared-jackpot-networks-v1',generatedAt:new Date().toISOString(),operator:'playuzu-es',appName:APP,sourcePage:'https://www.playuzu.es/jackpots/',backendPath:BASE,summary:{pagesFetched:pages.length,http200Pages:pages.filter(x=>x.httpStatus===200).length,positiveJackpotGames:games.length,distinctRawCounters:networks.length,sharedNetworks:shared.length,titlesInSharedNetworks:shared.reduce((s,x)=>s+x.distinctTitles,0)},sharedNetworks:shared,singletons:networks.filter(x=>x.distinctTitles===1).slice(0,100),pages,interpretation:{networkIdentityConfirmed:false,exactRawCounterSharingObserved:true,currencyTrusted:false,positiveEVKnown:false,reason:'Exact shared raw jackpot counters across distinct titles are discovery evidence for candidate progressive networks only; contribution, trigger odds, currency localization and economic value remain unproven.'},guards:{officialPlayUZUSpainSeedOnly:true,exactObservedAppNameOnly:true,noLoginBypass:true,noBetting:true,noEconomicPromotionFromCounterSharing:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/playuzu/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({summary:out.summary,topShared:shared.slice(0,10).map(x=>({rawCounter:x.rawCounter,distinctTitles:x.distinctTitles,providers:x.providers,currencies:x.reportedCurrencies}))},null,2));