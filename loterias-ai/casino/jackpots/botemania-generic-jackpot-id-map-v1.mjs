#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const FEED='loterias-ai/casino/jackpots/evidence/botemania-headless-jackpots-public-probe-v1.json';
const MAP='loterias-ai/casino/archive/evidence/botemania-progressive-network-map-v1.json';
const CENSUS='loterias-ai/casino/archive/evidence/botemania-all-games-census-v1.json';
const OUT='loterias-ai/casino/jackpots/evidence/botemania-generic-jackpot-id-map-v1.json';
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const feed=read(FEED), map=read(MAP), census=read(CENSUS);
if(!feed?.jackpots?.generic?.length)throw new Error('Generic live jackpot feed unavailable');
const live=[];const seen=new Set();for(const x of feed.jackpots.generic){const id=String(x?.id||''),amount=Number(x?.amountEUR);const k=`${id}|${amount}`;if(id&&Number.isFinite(amount)&&!seen.has(k)){seen.add(k);live.push({id,amountEUR:amount});}}
const ambiguous=new Set(['JACKPOT','JackpotPool','WAGER_BET','progressive_id1','GRAND','GOLD','pool1']);
const specificLive=live.filter(x=>!ambiguous.has(x.id));
const censusBy=new Map((census?.games||[]).map(x=>[x.slug,x]));const games=(map?.rows||[]).filter(x=>x?.url&&x?.httpStatus===200);
const UA='loterias-ai-generic-jackpot-id-map/1.1-specific-only';
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'');
let cursor=0;const rows=[];
async function worker(){while(true){const i=cursor++;if(i>=games.length)return;const g=games[i];try{const r=await fetch(g.url,{headers:{accept:'text/html,*/*','user-agent':UA,'cache-control':'no-cache'},redirect:'follow'});const html=await r.text();const exact=[];for(const j of specificLive){const pos=html.indexOf(j.id);if(pos>=0)exact.push({id:j.id,amountEUR:j.amountEUR,context:html.slice(Math.max(0,pos-240),Math.min(html.length,pos+j.id.length+420)).replace(/\s+/g,' ').slice(0,700)});}
const cg=censusBy.get(g.slug)||{},slugNorm=norm(g.slug),titleNorm=norm(g.title),heur=[];for(const j of specificLive){const n=norm(j.id),token=n.replace(/id\d*$/,'').replace(/progressive/g,'');if(token.length>=5&&(slugNorm.includes(token)||titleNorm.includes(token)||token.includes(slugNorm)))heur.push({id:j.id,amountEUR:j.amountEUR,method:'NORMALIZED_NAME_TOKEN_DISCOVERY_ONLY'});}
rows[i]={slug:g.slug,title:g.title,url:g.url,httpStatus:r.status,pageSha256:crypto.createHash('sha256').update(html).digest('hex'),baseRtpCandidatesPct:cg.rtpPcts||[],contributionPct:g.contributionPct||[],resetZero:Boolean(g.resetZero),anyStake:Boolean(g.anyStake),proportionalToBet:Boolean(g.proportionalToBet),increasesWithPot:Boolean(g.increasesWithPot),exactSpecificIdMatches:exact,heuristicNameMatches:heur};}catch(e){rows[i]={slug:g.slug,title:g.title,url:g.url,error:String(e?.message||e)};}}}
await Promise.all(Array.from({length:6},()=>worker()));
const clean=rows.filter(Boolean),exactMappings=clean.filter(x=>x.exactSpecificIdMatches?.length).map(x=>({slug:x.slug,title:x.title,url:x.url,baseRtpCandidatesPct:x.baseRtpCandidatesPct,contributionPct:x.contributionPct,resetZero:x.resetZero,anyStake:x.anyStake,proportionalToBet:x.proportionalToBet,matches:x.exactSpecificIdMatches})),heuristics=clean.filter(x=>x.heuristicNameMatches?.length).map(x=>({slug:x.slug,title:x.title,matches:x.heuristicNameMatches}));
const out={version:'botemania-generic-jackpot-id-map-v1.1-specific-only',generatedAt:new Date().toISOString(),operator:'botemania-es',sourceFeedGeneratedAt:feed.generatedAt||null,liveGenericJackpots:live,ambiguousIdsExcludedFromPageMatching:[...ambiguous],specificLiveIds:specificLive,summary:{uniqueLiveIdAmountPairs:live.length,specificLiveIdAmountPairs:specificLive.length,progressivePagesScanned:games.length,exactSpecificPageMappings:exactMappings.length,heuristicDiscoveryMappings:heuristics.length},exactMappings,heuristicDiscoveryOnly:heuristics,rows:clean,decision:{mappingEvidenceReady:exactMappings.length>0,economicPromotionAllowed:false,realMoneyAllowed:false},guards:{publicPagesOnly:true,noAuthentication:true,noCookies:true,ambiguousGenericIdsNeverCountAsExactMapping:true,caseSensitiveSpecificIdMatch:true,heuristicsDiscoveryOnly:true,noBetting:true,realMoneyAllowed:false}};
fs.mkdirSync('loterias-ai/casino/jackpots/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({summary:out.summary,exactMappings,heuristics},null,2));
