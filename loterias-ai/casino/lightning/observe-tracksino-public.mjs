import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const url='https://www.tracksino.com/lightning-roulette';
const out='loterias-ai/casino/lightning/evidence/public-observer.json';
const r=await fetch(url,{headers:{'user-agent':'LoteriasAI-ResearchObserver/1.0 (+public aggregate research; no betting)'}});
if(!r.ok) throw new Error(`Public observer HTTP ${r.status}`);
const html=await r.text();
const text=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').trim();
const pairs=[...text.matchAll(/\((\d+)\s*\/\s*(\d+)\)/g)].map(m=>({count:Number(m[1]),total:Number(m[2])})).filter(x=>x.total>0);
const totals={};for(const p of pairs)totals[p.total]=(totals[p.total]||0)+1;
const total24h=Object.entries(totals).sort((a,b)=>b[1]-a[1]||Number(b[0])-Number(a[0]))[0]?.[0];
const detected={lightningRoulette:/Lightning Roulette/i.test(text),roundHistory:/Round History/i.test(text),rouletteNumbers:/Roulette Numbers/i.test(text),frequencyRows:pairs.length};
if(!detected.lightningRoulette||pairs.length<20)throw new Error('Public page shape changed; refusing to record ambiguous evidence');
const evidence={observedAt:new Date().toISOString(),source:'tracksino-public-web',url,scope:'PUBLIC_AGGREGATE_SANITY_ONLY',detected,approxDisplayedWindowRows:total24h?Number(total24h):null,frequencyPairSample:pairs.slice(0,40),pageSha256:crypto.createHash('sha256').update(html).digest('hex'),roundLevelData:false,luckyMultiplierRoundData:false,trainingEligible:false,paperReplayEligible:false,realMoney:false,note:'Public aggregate observer is intentionally isolated from the scientific round corpus. It proves source visibility only; it must never be promoted to round-level training data.'};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({status:'PUBLIC_OBSERVER_OK',approxDisplayedWindowRows:evidence.approxDisplayedWindowRows,frequencyRows:pairs.length,trainingEligible:false,realMoney:false},null,2));
