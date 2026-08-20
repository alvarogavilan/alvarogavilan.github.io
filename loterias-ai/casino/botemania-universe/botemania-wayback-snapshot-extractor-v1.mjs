#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const INDEX='loterias-ai/casino/botemania-universe/evidence/botemania-wayback-index-v1.json';
const OUT='loterias-ai/casino/botemania-universe/evidence/botemania-wayback-structured-history-v1.json';
const STATE='loterias-ai/casino/botemania-universe/evidence/botemania-wayback-extractor-state-v1.json';
const UA='loterias-ai-botemania-wayback-structured-extractor/1.0';
const read=p=>{try{const s=fs.readFileSync(p,'utf8');return s.trim()?JSON.parse(s):null}catch{return null}};
const index=read(INDEX);if(!index?.games)throw new Error('Wayback metadata index not available yet');
const prior=read(OUT)||{version:'botemania-wayback-structured-history-v1',createdAt:new Date().toISOString(),observations:{}};
const state=read(STATE)||{version:'botemania-wayback-extractor-state-v1',cursor:0,completedCycles:0};
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const dec=s=>Number(String(s).replace(/\./g,'').replace(',','.'));
const strip=s=>String(s).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&euro;|&#8364;/gi,'€').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const uniq=a=>[...new Set(a.filter(x=>x!=null&&x!==''))];
const jobs=[];
for(const [url,g] of Object.entries(index.games))for(const s of g?.snapshots||[])if(s?.timestamp)jobs.push({url,title:g.title||null,slug:g.slug||null,category:g.category||null,timestamp:s.timestamp,digest:s.digest||null});
jobs.sort((a,b)=>a.url.localeCompare(b.url)||String(a.timestamp).localeCompare(String(b.timestamp)));
if(!jobs.length)throw new Error('Wayback index contains no snapshots yet');
let cursor=Math.max(0,Number(state.cursor)||0)%jobs.length;const batchSize=12;const batch=[];for(let i=0;i<Math.min(batchSize,jobs.length);i++)batch.push(jobs[(cursor+i)%jobs.length]);
function parse(text,url){
 const rtpContexts=uniq([...text.matchAll(/(?:Porcentaje de Retorno al Jugador|\bRTP\b)[^.]{0,650}/gi)].map(m=>m[0].slice(0,650))).slice(0,8);
 const rtpPcts=uniq(rtpContexts.flatMap(c=>[...c.matchAll(/(\d{1,2}(?:[.,]\d{1,3})?)\s*%/g)].map(m=>dec(m[1])).filter(x=>x>0&&x<100)));
 const euroPlus=rtpContexts.map(c=>c.match(/(\d{2}(?:[.,]\d{1,3})?)\s*€\s*\+\s*(\d{1,2}(?:[.,]\d{1,3})?)\s*%/i)).find(Boolean);
 const betContexts=uniq([...text.matchAll(/(?:valor moneda|apuesta(?: total)?|apuesta mínima|apuesta máxima)[^.]{0,260}/gi)].map(m=>m[0].slice(0,260))).slice(0,8);
 const jackpotContexts=uniq([...text.matchAll(/(?:Jackpot King|Bote Progresivo|Must Drop|Debe ganarse|Habrá un ganador antes)[^.]{0,420}/gi)].map(m=>m[0].slice(0,420))).slice(0,12);
 const capContexts=uniq([...text.matchAll(/(?:Debe ganarse en|Habrá un ganador antes|Must Drop Within|Must Be Won By)[^.]{0,260}/gi)].map(m=>m[0].slice(0,260))).slice(0,8);
 const mechanics=uniq([/Jackpot King/i.test(text)?'JACKPOT_KING':null,/Must Drop|Debe ganarse|Habrá un ganador antes|Must Be Won/i.test(text)?'MUST_DROP_OR_MUST_BE_WON':null,/Bote Progresivo|Progressive/i.test(text)?'PROGRESSIVE':null,/Megaways/i.test(text)?'MEGAWAYS':null]);
 const stateDependent=/probabilidades?[^.]{0,260}(?:aumentan|aumenta|crecen|crece|incrementan|incrementa)[^.]{0,200}(?:valor|cantidad)[^.]{0,160}(?:bote|jackpot)/i.test(text);
 return {url,rtpContexts,rtpPcts,euroReturnPlusPct:euroPlus?{returnPer100EUR:dec(euroPlus[1]),extraPct:dec(euroPlus[2])}:null,betContexts,jackpotContexts,capContexts,mechanics,stateDependentProbability:stateDependent};
}
const runAt=new Date().toISOString();let successes=0,failures=0;
for(const j of batch){const key=`${j.url}|${j.timestamp}`;if(prior.observations[key]?.extracted===true)continue;const replay=`https://web.archive.org/web/${j.timestamp}id_/${j.url}`;try{const r=await fetch(replay,{headers:{accept:'text/html,*/*','user-agent':UA},redirect:'follow'}),html=await r.text();if(!r.ok){prior.observations[key]={...j,replayUrl:replay,checkedAt:runAt,httpStatus:r.status,extracted:false,error:`HTTP_${r.status}`};failures++;continue;}const text=strip(html),parsed=parse(text,j.url);prior.observations[key]={...j,replayUrl:replay,checkedAt:runAt,httpStatus:r.status,bytes:html.length,contentSha256:sha(html),extracted:true,...parsed};successes++;}catch(e){prior.observations[key]={...j,replayUrl:replay,checkedAt:runAt,httpStatus:null,extracted:false,error:String(e?.message||e)};failures++;}await new Promise(r=>setTimeout(r,500));}
cursor=(cursor+batch.length)%jobs.length;if(cursor===0)state.completedCycles=(Number(state.completedCycles)||0)+1;state.cursor=cursor;state.updatedAt=runAt;state.snapshotJobs=jobs.length;state.lastBatchSize=batch.length;state.lastBatchSuccesses=successes;state.lastBatchFailures=failures;
const vals=Object.values(prior.observations);prior.updatedAt=runAt;prior.summary={snapshotJobsKnown:jobs.length,snapshotsAttempted:vals.length,snapshotsExtracted:vals.filter(x=>x.extracted).length,withRtp:vals.filter(x=>x.extracted&&x.rtpPcts?.length).length,withJackpotMechanics:vals.filter(x=>x.extracted&&x.mechanics?.some(m=>/JACKPOT|PROGRESSIVE|MUST/.test(m))).length,withCapContext:vals.filter(x=>x.extracted&&x.capContexts?.length).length,uniqueGamesWithExtractedHistory:new Set(vals.filter(x=>x.extracted).map(x=>x.url)).size};prior.guards={publicWaybackReplayOnly:true,structuredFactsAndShortContextsOnly:true,noRawSnapshotArchive:true,noAuthentication:true,noBetting:true,realMoneyAllowed:false};
fs.mkdirSync('loterias-ai/casino/botemania-universe/evidence',{recursive:true});fs.writeFileSync(OUT,JSON.stringify(prior,null,2)+'\n');fs.writeFileSync(STATE,JSON.stringify(state,null,2)+'\n');console.log(JSON.stringify({summary:prior.summary,state},null,2));
