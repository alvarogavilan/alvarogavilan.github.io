#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const URL='https://www.playuzu.es/blackjack/';
const OUT='loterias-ai/casino/playuzu/evidence/blackjack-nuxt-decoded-v1.json';
const r=await fetch(URL,{headers:{accept:'text/html','user-agent':'loterias-ai-playuzu-nuxt-decoder/1.0','cache-control':'no-cache, no-store'}});
const html=await r.text();
const m=html.match(/<script[^>]+id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
if(!m)throw new Error('NUXT_DATA not found');
const root=JSON.parse(m[1]);
const memo=new Map();
function ref(i){
  if(!Number.isInteger(i)||i<0||i>=root.length)return i;
  if(memo.has(i))return memo.get(i);
  const v=root[i];
  if(v===null||typeof v!=='object')return v;
  if(Array.isArray(v)){
    if(typeof v[0]==='string'&&['ShallowReactive','Reactive','Ref','Computed'].includes(v[0])&&Number.isInteger(v[1]))return ref(v[1]);
    const out=[];memo.set(i,out);for(const x of v)out.push(Number.isInteger(x)?ref(x):x);return out;
  }
  const out={};memo.set(i,out);for(const [k,x] of Object.entries(v))out[k]=Number.isInteger(x)?ref(x):x;return out;
}
let categoryIndex=-1;
for(let i=0;i<root.length;i++){
  const v=root[i];if(!v||Array.isArray(v)||typeof v!=='object'||!Object.hasOwn(v,'category')||!Object.hasOwn(v,'games'))continue;
  try{if(ref(v.category)==='blackjack-all'){categoryIndex=i;break}}catch{}
}
if(categoryIndex<0)throw new Error('blackjack category object not found');
const cat=ref(categoryIndex);
const games=Array.isArray(cat.games)?cat.games:[];
const rows=games.map(g=>({
  applicationName:g.application_name??g.item_title??null,
  internalGameId:g.internal_game_id??null,
  externalGameId:g.external_game_id??null,
  provider:g.game_provider??null,
  studio:g.studio??null,
  decks:g.decks??null,
  liveDealer:g.live_dealer??null,
  minBet:g.min_bet??null,
  maxBet:g.max_bet??null,
  maxWin:g.max_win??null,
  rtpMin:g.rtp_min??null,
  rtpMax:g.rtp_max??null,
  ojoPlus:g.ojo_plus??null,
  ojoPlusPercent:g.ojo_plus_percent??null,
  funMode:g.fun_mode??null,
  specialBets:g.special_bets??null,
  categories:g.categories??null,
  infoLabel:g.info_label??null,
  rawSelected:{game_provider:g.game_provider??null,rtp_min:g.rtp_min??null,rtp_max:g.rtp_max??null,ojo_plus:g.ojo_plus??null,ojo_plus_percent:g.ojo_plus_percent??null,decks:g.decks??null,min_bet:g.min_bet??null,max_bet:g.max_bet??null}
}));
const plusValues=rows.map(x=>Number(String(x.ojoPlusPercent).replace(',','.'))).filter(Number.isFinite);
const payload={version:'blackjack-nuxt-decoded-v1',generatedAt:new Date().toISOString(),source:URL,httpStatus:r.status,responseSha256:crypto.createHash('sha256').update(html).digest('hex'),category:{category:cat.category,total:cat.total??games.length,pagination:cat.pagination??null},summary:{games:rows.length,withRtp:rows.filter(x=>x.rtpMin!=null||x.rtpMax!=null).length,withInternalPlusPercent:rows.filter(x=>x.ojoPlusPercent!=null).length,internalPlusPercentValues:plusValues},games:rows,semanticCaution:{ojoPlusPercentMeaningConfirmedAsUZUplusCashback:false,reason:'Internal backend field naming is legacy/shared-platform nomenclature. It must be mapped to current PlayUZU UZUplus semantics before economic use.',runnerGeoMayDifferFromSpain:true,serverObservedCountryMayReflectGitHubRunnerIp:true},guards:{officialPlayUZUHtmlOnly:true,noBackendGuessing:true,noLoginBypass:true,noBetting:true,noEconomicPromotionUntilPlusSemanticsVerified:true,realMoneyAllowed:false}};
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n');console.log(JSON.stringify({summary:payload.summary,games:rows.map(x=>({name:x.applicationName,provider:x.provider,rtpMin:x.rtpMin,rtpMax:x.rtpMax,ojoPlus:x.ojoPlus,ojoPlusPercent:x.ojoPlusPercent}))},null,2));