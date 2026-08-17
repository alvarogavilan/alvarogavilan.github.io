#!/usr/bin/env node
import fs from 'node:fs';
const src='loterias-ai/casino/lightning/data/casinoorg-lightningroulette.jsonl';
const dst='loterias-ai/casino/lightning/evidence/recent-window-repeat-audit.json';
const rows=fs.readFileSync(src,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse).filter(r=>Number.isInteger(r.winningNumber));
rows.sort((a,b)=>new Date(a.settledAt)-new Date(b.settledAt));
function audit(k){let hits=0,exp=0,n=0,uniqSum=0;const byUnique={};for(let i=k;i<rows.length;i++){const prev=rows.slice(i-k,i).map(r=>r.winningNumber);const u=new Set(prev);const hit=u.has(rows[i].winningNumber);hits+=hit;n++;uniqSum+=u.size;exp+=u.size/37;const key=String(u.size);byUnique[key]??={n:0,hits:0};byUnique[key].n++;byUnique[key].hits+=hit;}const p=hits/n,e=exp/n;const se=Math.sqrt(e*(1-e)/n);return{window:k,trials:n,hits,observedRate:p,averageUniqueNumbers:uniqSum/n,conditionalUniformExpectedRate:e,excessRate:p-e,zApprox:se?((p-e)/se):null,byUnique};}
const windows=[];for(let k=5;k<=20;k++)windows.push(audit(k));
const out={version:'lightning-recent-window-repeat-v1',generatedAt:new Date().toISOString(),rounds:rows.length,definition:'next winning number belongs to set of unique winning numbers observed in previous k rounds',windows,guards:{exploratory:true,multiplicityCorrectionRequired:true,claimAllowed:false,realMoney:false,next:'freeze-promising-window-then-prospective-evaluation'}};
fs.writeFileSync(dst,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));