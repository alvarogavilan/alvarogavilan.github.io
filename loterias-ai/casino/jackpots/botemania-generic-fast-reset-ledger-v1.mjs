#!/usr/bin/env node
import fs from 'node:fs';

const FEED='loterias-ai/casino/jackpots/evidence/botemania-headless-jackpots-public-probe-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-generic-fast-reset-ledger-v1.json';
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const feed=read(FEED);
if(!feed?.jackpots?.generic?.length) throw new Error('generic jackpot feed unavailable');
const prior=read(OUT)||{};

const grouped=new Map();
for(const row of feed.jackpots.generic){
  const id=String(row?.id||'').trim(); const amount=Number(row?.amountEUR);
  if(!id||!Number.isFinite(amount)) continue;
  if(!grouped.has(id)) grouped.set(id,new Set());
  grouped.get(id).add(amount);
}
const tracks=[];
for(const [id,set] of grouped){
  [...set].sort((a,b)=>a-b).forEach((amount,rank)=>tracks.push({trackKey:`${id}::${rank}`,id,rank,amountEUR:amount}));
}
const prevBy=new Map((prior?.lastTracks||[]).map(x=>[x.trackKey,x]));
const events=Array.isArray(prior?.events)?[...prior.events]:[];
const seen=new Set(events.map(e=>e.eventKey));
const observedAt=feed.generatedAt||new Date().toISOString();
for(const cur of tracks){
  const prev=prevBy.get(cur.trackKey); if(!prev) continue;
  const p=Number(prev.amountEUR), c=Number(cur.amountEUR); if(!Number.isFinite(p)||!Number.isFinite(c)) continue;
  const drop=p-c; const threshold=Math.max(0.5,p*0.002);
  if(drop>threshold){
    const eventKey=`${cur.trackKey}|${p.toFixed(2)}|${c.toFixed(2)}|${observedAt}`;
    if(!seen.has(eventKey)){
      events.push({eventKey,observedAt,trackKey:cur.trackKey,id:cur.id,rank:cur.rank,previousEUR:p,currentEUR:c,dropEUR:Number(drop.toFixed(2)),dropFraction:Number((drop/p).toFixed(6)),classification:'UNCLASSIFIED_DROP_CANDIDATE',economicPromotionAllowed:false});
      seen.add(eventKey);
    }
  }
}
const out={
  version:'botemania-generic-fast-reset-ledger-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',
  sourceFeedGeneratedAt:observedAt,trackCount:tracks.length,lastTracks:tracks,
  events:events.slice(-1200),summary:{eventCount:events.length,newestEvent:events.length?events[events.length-1]:null},
  interpretation:'Compact fast ledger of significant public jackpot-meter drops. A drop is a candidate only; it is not automatically classified as a jackpot win/reset.',
  guards:{publicFeedOnly:true,noAuthentication:true,noCookies:true,noBetting:true,noDropEqualsWinAssumption:true,noEconomicPromotionFromLedgerAlone:true,realMoneyAllowed:false}
};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({trackCount:out.trackCount,eventCount:out.summary.eventCount,newestEvent:out.summary.newestEvent},null,2));
