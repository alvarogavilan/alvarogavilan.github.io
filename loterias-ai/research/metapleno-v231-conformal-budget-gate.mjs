#!/usr/bin/env node
/** v231 — Conformal Budget Gate. Fail-closed budget selector trained only pre-2023. */
import fs from 'node:fs';
const root=new URL('../',import.meta.url);const read=p=>JSON.parse(fs.readFileSync(new URL(p,root),'utf8'));
const arc=read('data/archive/bonoloto/all.json');const rec=(arc.records||arc.draws||[]).map(x=>({date:x.drawDate||x.date,main:(x.result?.main||x.main||x.numbers||[]).map(Number)})).filter(x=>x.date&&x.main.length===6).sort((a,b)=>a.date.localeCompare(b.date));
const train=rec.filter(x=>x.date<'2023-01-01'),val=rec.filter(x=>x.date>='2023-01-01'&&x.date<'2025-01-01'),post=rec.filter(x=>x.date>='2025-01-01');
function rank(hist){const s=Array(50).fill(0),last=Array(50).fill(-9999);hist.forEach((d,i)=>d.main.forEach(n=>{s[n]++;last[n]=i}));return Array.from({length:49},(_,i)=>i+1).sort((a,b)=>(s[b]+.12*(hist.length-last[b]))-(s[a]+.12*(hist.length-last[a]))||a-b)}
function evalEra(era,history,k){let n=0,h5=0,h6=0;const rows=[];for(const d of era){const r=rank(history),set=new Set(r.slice(0,k)),h=d.main.filter(x=>set.has(x)).length;n++;if(h>=5)h5++;if(h===6)h6++;rows.push({date:d.date,hits:h});history.push(d)}return{n,h5,h6,rows}}
// Pre-2023 conformal calibration: choose smallest k in {6,7,8,9} whose rolling miss-rate for >=5 is <= alpha.
const alpha=.20,ks=[6,7,8,9],cal=train.filter(x=>x.date>='2018-01-01');let selected=9,calibration=[];
for(const k of ks){const h=train.filter(x=>x.date<'2018-01-01');const e=evalEra(cal,h,k);const miss=1-e.h5/Math.max(1,e.n);calibration.push({k,n:e.n,hit5:e.h5,missRate:miss});if(miss<=alpha){selected=k;break}}
const budget=selected<=8?14:15;const h0=train.slice();const validation=evalEra(val,h0,selected),postFreeze=evalEra(post,h0,selected);
const result={version:'v231',engine:'Conformal Budget Gate',game:'bonoloto',generatedAt:new Date().toISOString(),selection:{trainEnd:'2022-12-31',alpha,selectedPoolSize:selected,theoreticalBudgetEUR:budget,realMoneyPass:false,realStakeEUR:0},calibration,validation:{n:validation.n,hit5:validation.h5,hit6:validation.h6},postFreeze:{n:postFreeze.n,hit5:postFreeze.h5,hit6:postFreeze.h6},decision:'RESEARCH_ONLY',note:'Pool-size calibration is pre-2023 only. No retrospective result authorizes real money.'};
fs.mkdirSync(new URL('data/research/',root),{recursive:true});fs.writeFileSync(new URL('data/research/metapleno-v231-conformal-budget-gate.json',root),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));