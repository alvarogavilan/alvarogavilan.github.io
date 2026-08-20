#!/usr/bin/env node
import fs from 'node:fs';
const DB='loterias-ai/casino/botemania-universe/evidence/botemania-universe-current-v1.json';
const OUT='loterias-ai/casino/botemania-universe/evidence/botemania-wayback-index-v1.json';
const STATE='loterias-ai/casino/botemania-universe/evidence/botemania-wayback-state-v1.json';
const UA='loterias-ai-botemania-wayback-indexer/1.0';
const now=new Date().toISOString();
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null}};
const db=read(DB);if(!db?.games?.length)throw new Error('Current Botemania universe database missing');
const prior=read(OUT)||{version:'botemania-wayback-index-v1',createdAt:now,games:{}};
const state=read(STATE)||{version:'botemania-wayback-state-v1',cursor:0,completedCycles:0};
const games=db.games.filter(x=>x.httpStatus===200&&x.url);const batchSize=30;let cursor=Number(state.cursor)||0;
const batch=[];for(let i=0;i<Math.min(batchSize,games.length);i++)batch.push(games[(cursor+i)%games.length]);
async function cdx(url){
  const q=new URL('https://web.archive.org/cdx/search/cdx');q.searchParams.set('url',url);q.searchParams.set('output','json');q.searchParams.set('fl','timestamp,original,statuscode,digest');q.searchParams.append('filter','statuscode:200');q.searchParams.set('collapse','digest');q.searchParams.set('limit','1000');
  try{const r=await fetch(q,{headers:{accept:'application/json','user-agent':UA}});const text=await r.text();if(!r.ok)return {httpStatus:r.status,error:`HTTP_${r.status}`,snapshots:[]};let j=null;try{j=JSON.parse(text)}catch{return {httpStatus:r.status,error:'INVALID_JSON',snapshots:[]}};if(!Array.isArray(j)||j.length<2)return {httpStatus:r.status,snapshots:[]};const head=j[0],rows=j.slice(1);const idx=Object.fromEntries(head.map((x,i)=>[x,i]));const snapshots=rows.map(r=>({timestamp:r[idx.timestamp],digest:r[idx.digest],statuscode:r[idx.statuscode]})).filter(x=>x.timestamp&&x.digest);return {httpStatus:r.status,snapshots};}catch(e){return {httpStatus:null,error:String(e?.message||e),snapshots:[]};}
}
for(const g of batch){const res=await cdx(g.url);prior.games[g.url]={title:g.title||null,slug:g.slug||null,category:g.category||null,checkedAt:now,httpStatus:res.httpStatus,error:res.error||null,snapshotCount:res.snapshots.length,firstSnapshot:res.snapshots[0]?.timestamp||null,lastSnapshot:res.snapshots.at(-1)?.timestamp||null,snapshots:res.snapshots};await new Promise(r=>setTimeout(r,250));}
cursor=(cursor+batch.length)%games.length;if(cursor===0)state.completedCycles=(Number(state.completedCycles)||0)+1;state.cursor=cursor;state.updatedAt=now;state.gamesTotal=games.length;state.lastBatchSize=batch.length;state.lastBatchUrls=batch.map(x=>x.url);
prior.updatedAt=now;prior.summary={gamesInCurrentUniverse:games.length,gamesWithArchiveChecks:Object.keys(prior.games).length,gamesWithSnapshots:Object.values(prior.games).filter(x=>x.snapshotCount>0).length,totalUniqueSnapshots:Object.values(prior.games).reduce((a,x)=>a+(x.snapshotCount||0),0)};
prior.guards={publicArchiveMetadataOnly:true,noSnapshotContentCopied:true,noAuthentication:true,noBetting:true,realMoneyAllowed:false};
fs.mkdirSync('loterias-ai/casino/botemania-universe/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(prior,null,2)+'\n');fs.writeFileSync(STATE,JSON.stringify(state,null,2)+'\n');console.log(JSON.stringify({summary:prior.summary,state},null,2));
