#!/usr/bin/env node
import fs from 'node:fs';
const DB='loterias-ai/casino/botemania-universe/evidence/botemania-universe-current-v1.json';
const LEDGER='loterias-ai/casino/botemania-universe/evidence/botemania-universe-change-ledger-v1.json';
const SLOT_DB='loterias-ai/casino/archive/evidence/botemania-all-games-census-v1.json';
const OUT='loterias-ai/casino/botemania-universe/evidence/botemania-wayback-index-v1.json';
const STATE='loterias-ai/casino/botemania-universe/evidence/botemania-wayback-state-v1.json';
const UA='loterias-ai-botemania-wayback-indexer/1.1';
const now=new Date().toISOString();
const read=p=>{try{const s=fs.readFileSync(p,'utf8');return s.trim()?JSON.parse(s):null}catch{return null}};
const db=read(DB),ledger=read(LEDGER),slotDb=read(SLOT_DB);
function canonical(url){try{const u=new URL(url);u.search='';u.hash='';return u.href}catch{return null}}
const map=new Map();
if(Array.isArray(db?.games))for(const g of db.games){const u=canonical(g?.url);if(u)map.set(u,{url:u,title:g.title||null,slug:g.slug||null,category:g.category||null,httpStatus:g.httpStatus??200,source:'UNIVERSE_CURRENT'});}
if(!map.size&&Array.isArray(ledger?.events))for(const ev of ledger.events)for(const raw of ev?.added||[]){const u=canonical(raw);if(!u)continue;const p=new URL(u).pathname.split('/').filter(Boolean);map.set(u,{url:u,title:null,slug:p.slice(2).join('/'),category:p[1]||null,httpStatus:200,source:'UNIVERSE_LEDGER_FALLBACK'});}
if(Array.isArray(slotDb?.games))for(const g of slotDb.games){const u=canonical(g?.url);if(!u||map.has(u))continue;map.set(u,{url:u,title:g.title||null,slug:g.slug||null,category:'slots-online',httpStatus:g.httpStatus??200,source:'SLOT_CENSUS_FALLBACK'});}
const games=[...map.values()].filter(x=>x.httpStatus===200&&x.url).sort((a,b)=>a.url.localeCompare(b.url));
if(!games.length)throw new Error('No Botemania public game universe recoverable from current DB, ledger or slot census');
const prior=read(OUT)||{version:'botemania-wayback-index-v1',createdAt:now,games:{}};
const state=read(STATE)||{version:'botemania-wayback-state-v1',cursor:0,completedCycles:0};
const batchSize=30;let cursor=Math.max(0,Number(state.cursor)||0)%games.length;
const batch=[];for(let i=0;i<Math.min(batchSize,games.length);i++)batch.push(games[(cursor+i)%games.length]);
async function cdx(url){
  const q=new URL('https://web.archive.org/cdx/search/cdx');q.searchParams.set('url',url);q.searchParams.set('output','json');q.searchParams.set('fl','timestamp,original,statuscode,digest');q.searchParams.append('filter','statuscode:200');q.searchParams.set('collapse','digest');q.searchParams.set('limit','1000');
  try{const r=await fetch(q,{headers:{accept:'application/json','user-agent':UA}});const text=await r.text();if(!r.ok)return {httpStatus:r.status,error:`HTTP_${r.status}`,snapshots:[]};let j=null;try{j=JSON.parse(text)}catch{return {httpStatus:r.status,error:'INVALID_JSON',snapshots:[]}};if(!Array.isArray(j)||j.length<2)return {httpStatus:r.status,snapshots:[]};const head=j[0],rows=j.slice(1),idx=Object.fromEntries(head.map((x,i)=>[x,i]));const snapshots=rows.map(r=>({timestamp:r[idx.timestamp],digest:r[idx.digest],statuscode:r[idx.statuscode]})).filter(x=>x.timestamp&&x.digest);return {httpStatus:r.status,snapshots};}catch(e){return {httpStatus:null,error:String(e?.message||e),snapshots:[]};}
}
for(const g of batch){const res=await cdx(g.url);prior.games[g.url]={title:g.title||null,slug:g.slug||null,category:g.category||null,universeSource:g.source||null,checkedAt:now,httpStatus:res.httpStatus,error:res.error||null,snapshotCount:res.snapshots.length,firstSnapshot:res.snapshots[0]?.timestamp||null,lastSnapshot:res.snapshots.at(-1)?.timestamp||null,snapshots:res.snapshots};await new Promise(r=>setTimeout(r,250));}
cursor=(cursor+batch.length)%games.length;if(cursor===0)state.completedCycles=(Number(state.completedCycles)||0)+1;state.cursor=cursor;state.updatedAt=now;state.gamesTotal=games.length;state.lastBatchSize=batch.length;state.lastBatchUrls=batch.map(x=>x.url);state.universeRecovery={currentDbGames:Array.isArray(db?.games)?db.games.length:0,ledgerEvents:Array.isArray(ledger?.events)?ledger.events.length:0,slotCensusGames:Array.isArray(slotDb?.games)?slotDb.games.length:0,recoveredGames:games.length,usedFallback:!(Array.isArray(db?.games)&&db.games.length>0)};
prior.updatedAt=now;prior.summary={gamesInCurrentUniverse:games.length,gamesWithArchiveChecks:Object.keys(prior.games).length,gamesWithSnapshots:Object.values(prior.games).filter(x=>x.snapshotCount>0).length,totalUniqueSnapshots:Object.values(prior.games).reduce((a,x)=>a+(x.snapshotCount||0),0)};prior.universeRecovery=state.universeRecovery;
prior.guards={publicArchiveMetadataOnly:true,noSnapshotContentCopied:true,noAuthentication:true,noBetting:true,realMoneyAllowed:false};
fs.mkdirSync('loterias-ai/casino/botemania-universe/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(prior,null,2)+'\n');fs.writeFileSync(STATE,JSON.stringify(state,null,2)+'\n');console.log(JSON.stringify({summary:prior.summary,state},null,2));
