#!/usr/bin/env node
import fs from 'node:fs';
const src='loterias-ai/casino/lightning/data/casinoorg-lightningroulette.jsonl';
const dst='loterias-ai/casino/lightning/evidence/recent-window-repeat-audit.json';
const rows=fs.readFileSync(src,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)
  .map(r=>({winner:Number(r.winner ?? r.winningNumber),timestamp:r.timestamp ?? r.settledAt}))
  .filter(r=>Number.isInteger(r.winner)&&r.winner>=0&&r.winner<=36&&r.timestamp);
rows.sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
function audit(k){let hits=0,exp=0,n=0,uniqSum=0;const byUnique={};for(let i=k;i<rows.length;i++){const prev=rows.slice(i-k,i).map(r=>r.winner);const u=new Set(prev);const hit=u.has(rows[i].winner);hits+=Number(hit);n++;uniqSum+=u.size;exp+=u.size/37;const key=String(u.size);byUnique[key]??={n:0,hits:0};byUnique[key].n++;byUnique[key].hits+=Number(hit);}const p=n?hits/n:null,e=n?exp/n:null;const se=n?Math.sqrt(e*(1-e)/n):null;return{window:k,trials:n,hits,observedRate:p,averageUniqueNumbers:n?uniqSum/n:null,conditionalUniformExpectedRate:e,excessRate:n?p-e:null,zApprox:se?((p-e)/se):null,byUnique};}
const windows=[];for(let k=5;k<=20;k++)windows.push(audit(k));
const out={version:'lightning-recent-window-repeat-v2',generatedAt:new Date().toISOString(),rounds:rows.length,definition:'next winning number belongs to set of unique winning numbers observed in previous k rounds',windows,guards:{exploratory:true,multiplicityCorrectionRequired:true,claimAllowed:false,realMoney:false,next:'freeze-promising-window-then-prospective-evaluation'}};
fs.writeFileSync(dst,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({rounds:out.rounds,windows:out.windows.map(x=>({window:x.window,trials:x.trials,hits:x.hits,observedRate:x.observedRate,expected:x.conditionalUniformExpectedRate,excess:x.excessRate,z:x.zApprox}))},null,2));