#!/usr/bin/env node
// v258 — Multi-Lag Overlap E-Process. Exact hypergeometric null per lag; equal mixtures preserve e-validity.
import fs from 'node:fs';
import path from 'node:path';
const ROOT='loterias-ai';
const ARCH=path.join(ROOT,'data','archive','bonoloto');
const OUT=path.join(ROOT,'data','research','metapleno-v258-multilag-overlap-eprocess.json');
const MAXN=49,K=6,THRESHOLD=20;
function C(n,k){if(k<0||k>n)return 0;k=Math.min(k,n-k);let x=1;for(let i=1;i<=k;i++)x=x*(n-k+i)/i;return x;}
const NULL=Array.from({length:7},(_,o)=>C(K,o)*C(MAXN-K,K-o)/C(MAXN,K));
function load(){let a=[];for(const f of fs.readdirSync(ARCH).filter(x=>/^\d{4}\.json$/.test(x)).sort()){const j=JSON.parse(fs.readFileSync(path.join(ARCH,f),'utf8'));for(const r of (j.records||j.draws||[])){const date=r.drawDate||r.date;const main=(r.result?.main||r.main||r.numbers||[]).map(Number).sort((x,y)=>x-y);if(date&&main.length===6)a.push({date,main});}}return [...new Map(a.map(x=>[x.date,x])).values()].sort((a,b)=>a.date.localeCompare(b.date));}
function overlap(a,b){const s=new Set(a);let c=0;for(const x of b)if(s.has(x))c++;return c;}
function run(rows,start,end,cfg){const counts=Array(7).fill(cfg.prior);let wealth=1,maxE=1,n=0;const trail=[];for(let i=cfg.lag;i<rows.length;i++){const d=rows[i];if(d.date<start||d.date>=end)continue;const o=overlap(rows[i-cfg.lag].main,d.main);const tot=counts.reduce((a,b)=>a+b,0);const alt=counts[o]/tot;const lr=alt/NULL[o];wealth*=lr;maxE=Math.max(maxE,wealth);counts[o]++;if(counts.reduce((a,b)=>a+b,0)>cfg.window+7*cfg.prior){for(let q=0;q<7;q++)counts[q]=cfg.prior+(counts[q]-cfg.prior)*(cfg.window/(cfg.window+1));}
 n++;if(n%100===0)trail.push({date:d.date,overlap:o,lr,wealth});}
return{n,finalE:wealth,maxE,anytimePBound:Math.min(1,1/maxE),trail};}
function mixture(results){if(!results.length)return{n:0,finalE:1,maxE:1,anytimePBound:1};const n=Math.min(...results.map(x=>x.n));const finalE=results.reduce((s,x)=>s+x.finalE,0)/results.length;const maxE=results.reduce((s,x)=>s+x.maxE,0)/results.length;return{n,finalE,maxE,anytimePBound:Math.min(1,1/maxE)};}
const rows=load();const lags=[1,2,3,5,10,20],windows=[365,1460],cfgs=[];for(const lag of lags)for(const window of windows)cfgs.push({lag,window,prior:1});
const train=cfgs.map(cfg=>({cfg,...run(rows,'2019-01-01','2023-01-01',cfg)}));train.sort((a,b)=>b.finalE-a.finalE||b.maxE-a.maxE||a.cfg.lag-b.cfg.lag);const selected=train[0].cfg;
const valSelected=run(rows,'2023-01-01','2025-01-01',selected),postSelected=run(rows,'2025-01-01','9999-12-31',selected);
const valAll=cfgs.map(c=>run(rows,'2023-01-01','2025-01-01',c)),postAll=cfgs.map(c=>run(rows,'2025-01-01','9999-12-31',c));
const valMix=mixture(valAll),postMix=mixture(postAll);
const replicated=(valSelected.maxE>=THRESHOLD&&postSelected.maxE>=THRESHOLD)||(valMix.maxE>=THRESHOLD&&postMix.maxE>=THRESHOLD);
const out={version:'v258',engine:'Multi-Lag Overlap E-Process',family:'MULTILAG_OVERLAP_EXACT_NULL',gameId:'bonoloto',generatedAt:new Date().toISOString(),archiveDraws:rows.length,nullModel:{description:'For every fixed lag, independent uniform 6-of-49 draws imply exact Hypergeometric(49,6,6) overlap with the lagged draw. Equal mixtures across predeclared lag/window e-processes preserve e-validity.',overlapProbabilities:NULL},candidatePool:{nominalConfigurations:cfgs.length,effectiveConfigurations:cfgs.length,lags,windows},selection:{criterion:'pre-2023 highest final e-value, then max e-value',selected,train:train[0]},validation:{period:'2023-2024',selectedConfig:valSelected,mixtureAcrossConfigs:valMix},postFreeze:{period:'2025+',selectedConfig:postSelected,mixtureAcrossConfigs:postMix},signal:{replicatedStrongEvidence:replicated,thresholdE:THRESHOLD,requiresAudit:replicated},decision:replicated?'AUDIT_SIGNAL':'NEGATIVE_NO_MULTILAG_SERIAL_BREAK',realMoneyPass:false,realStakeEUR:0,note:'Sequential dependence test only. No betting authorization; threshold is fixed before OOS evaluation.'};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));