import fs from 'node:fs';import vm from 'node:vm';
function load(p,name,ctx){vm.runInContext(fs.readFileSync(p,'utf8'),ctx);if(!ctx.globalThis[name])throw new Error(name+' missing');return ctx.globalThis[name];}
const ctx={globalThis:{},window:undefined,console,Date,Math,JSON,Number,String,Array,Set,Object,Error};vm.createContext(ctx);
const mega=load('loterias-ai/js/mega-numeric-engine.js','LotteryMegaNumericEngine',ctx);
const tournament=load('loterias-ai/js/walk-forward-tournament.js','LotteryWalkForwardTournament',ctx);
const draws=[];for(let i=0;i<80;i++){const base=(i%20)+1;const nums=[base,base+5,base+10,base+15,base+20,base+25].map(n=>((n-1)%49)+1).sort((a,b)=>a-b);draws.push({drawId:'d'+i,drawDate:`2025-${String(Math.floor(i/28)+1).padStart(2,'0')}-${String(i%28+1).padStart(2,'0')}`,numbers:nums});}
const game={id:'synthetic',main:{max:49,pick:6},minHistory:20};
const p=mega.portfolio(draws.slice(0,50).map(d=>d.numbers),game,{tickets:5});
if(p.status!=='candidate'||p.tickets.length!==5)throw new Error('portfolio generation failed');
for(const t of p.tickets){if(t.numbers.length!==6)throw new Error('ticket size');if(t.numberEvidence.length!==6)throw new Error('missing number evidence');}
const tr=tournament.run({draws,game,minHistory:20,strategies:tournament.defaultStrategies()});
if(tr.status!=='complete'||!tr.winner||tr.winner.drawsEvaluated!==60)throw new Error('walk-forward tournament failed');
if(!String(tr.leakageGuard).includes('strictly earlier'))throw new Error('leakage guard missing');
console.log('Mega engine + walk-forward tournament: PASS');