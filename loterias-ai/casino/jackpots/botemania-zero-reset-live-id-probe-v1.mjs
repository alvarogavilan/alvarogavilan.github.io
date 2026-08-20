#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const ZERO='loterias-ai/casino/archive/evidence/botemania-zero-reset-priority-v1.json';
const FEED='loterias-ai/casino/jackpots/evidence/botemania-headless-jackpots-public-probe-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-zero-reset-live-id-probe-v1.json';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const zero=read(ZERO),feed=read(FEED);const live=feed?.jackpots?.generic||[];
const ids=[...new Set(live.map(x=>String(x?.id||'')).filter(Boolean))];
const UA='loterias-ai-zero-reset-live-id-probe/1.0';
const needles=['jackpotsParams','jackpotId','jackpotName','jackpotname','gameEngineID','gameProductSkin','productSkin','headlessJackpots'];
const rows=[];
for(const g of zero.ranked||[]){
 try{
  const r=await fetch(g.url,{headers:{accept:'text/html,*/*','user-agent':UA,'cache-control':'no-cache'},redirect:'follow'}),html=await r.text();
  const paramContexts=[];for(const n of needles){let p=0,c=0;while(c<10){const i=html.indexOf(n,p);if(i<0)break;paramContexts.push({needle:n,index:i,context:html.slice(Math.max(0,i-600),Math.min(html.length,i+1400)).replace(/\s+/g,' ').slice(0,2200)});p=i+n.length;c++;}}
  const idMatches=[];for(const id of ids){if(id.length<5)continue;let p=0,c=0;while(c<3){const i=html.indexOf(id,p);if(i<0)break;idMatches.push({id,amountsEUR:[...new Set(live.filter(x=>String(x.id)===id).map(x=>Number(x.amountEUR)).filter(Number.isFinite))],context:html.slice(Math.max(0,i-500),Math.min(html.length,i+id.length+1000)).replace(/\s+/g,' ').slice(0,1800)});p=i+id.length;c++;}}
  rows.push({slug:g.slug,title:g.title,url:g.url,httpStatus:r.status,pageSha256:crypto.createHash('sha256').update(html).digest('hex'),baseRtpPct:g.baseRtpPct,publishedKnownPct:g.publishedBasePlusKnownContributionPct,distanceTo100Pct:g.distanceFromPublishedKnownTo100Pct,paramContexts,idMatches});
 }catch(e){rows.push({slug:g.slug,title:g.title,url:g.url,error:String(e?.message||e)});}
}
const resolved=rows.filter(x=>x.idMatches?.length).map(x=>({slug:x.slug,title:x.title,baseRtpPct:x.baseRtpPct,publishedKnownPct:x.publishedKnownPct,distanceTo100Pct:x.distanceTo100Pct,idMatches:x.idMatches}));
const out={version:'botemania-zero-reset-live-id-probe-v1',generatedAt:new Date().toISOString(),operator:'botemania-es',sourceFeedGeneratedAt:feed.generatedAt||null,liveIds:ids,rows,resolved,summary:{zeroResetGamesScanned:rows.length,gamesWithPublicParamContexts:rows.filter(x=>x.paramContexts?.length).length,gamesWithExactLiveIdInOwnPage:resolved.length},decision:{exactZeroResetLiveMappingRecovered:resolved.length>0,economicPromotionAllowed:false,realMoneyAllowed:false},guards:{publicPagesOnly:true,noAuthentication:true,noCookies:true,exactStringIdMatchesOnly:true,noHeuristicPromotion:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({summary:out.summary,resolved},null,2));
