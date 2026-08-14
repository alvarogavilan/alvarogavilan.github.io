import fs from 'node:fs';import vm from 'node:vm';
function load(path,names){const ctx={globalThis:{},window:undefined,console,Math,Number,String,Array,Set,Object,Map,Date,JSON};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path,'utf8'),ctx);return Object.fromEntries(names.map(n=>[n,ctx.globalThis[n]]));}
const a=load('loterias-ai/js/mega-numeric-engine.js',['LotteryMegaNumericEngine']);
const ctx={globalThis:{LotteryMegaNumericEngine:a.LotteryMegaNumericEngine},window:undefined,console,Math,Number,String,Array,Set,Object,Map,Date,JSON};vm.createContext(ctx);vm.runInContext(fs.readFileSync('loterias-ai/js/walk-forward-tournament.js','utf8'),ctx);const T=ctx.globalThis.LotteryWalkForwardTournament;
const games={bonoloto:{id:'bonoloto',main:{max:49,pick:6}},primitiva:{id:'primitiva',main:{max:49,pick:6}},euromillones:{id:'euromillones',main:{max:50,pick:5}},eurodreams:{id:'eurodreams',main:{max:40,pick:6}},'gordo-primitiva':{id:'gordo-primitiva',main:{max:54,pick:5}}};
const out={generatedAt:new Date().toISOString(),period:'2026-01-01..2026-08-14',mode:'RESEARCH_ONLY',games:{}};
for(const [id,game] of Object.entries(games)){
 const p=`loterias-ai/data/archive/${id}/2026.json`;if(!fs.existsSync(p)){out.games[id]={status:'archive_missing'};continue;}
 const raw=JSON.parse(fs.readFileSync(p,'utf8')).records||[];const draws=raw.map(r=>({drawId:r.drawId,drawDate:r.drawDate,numbers:(r.result?.main||[]).map(Number)})).filter(d=>d.numbers.every(Number.isFinite));
 const min=Math.min(60,Math.max(20,Math.floor(draws.length*.45)));
 if(draws.length<=min){out.games[id]={status:'insufficient_2026_sample',draws:draws.length,min};continue;}
 const r=T.run({draws,game,minHistory:min,strategies:T.defaultStrategies()});
 out.games[id]={status:r.status,draws:draws.length,minHistory:min,winner:r.winner&&{id:r.winner.id,drawsEvaluated:r.winner.drawsEvaluated,averageHits:r.winner.averageHits,bestTicketAverageHits:r.winner.bestTicketAverageHits,hitRateAtLeast2:r.winner.hitRateAtLeast2,hitRateAtLeast3:r.winner.hitRateAtLeast3,confidence95:r.winner.confidence95},strategies:r.strategies.map(s=>({id:s.id,drawsEvaluated:s.drawsEvaluated,averageHits:s.averageHits,bestTicketAverageHits:s.bestTicketAverageHits,hitRateAtLeast2:s.hitRateAtLeast2,hitRateAtLeast3:s.hitRateAtLeast3,confidence95:s.confidence95}))};
}
fs.mkdirSync('loterias-ai/data/backtests',{recursive:true});fs.writeFileSync('loterias-ai/data/backtests/research-tournament-2026.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out.games,null,2));