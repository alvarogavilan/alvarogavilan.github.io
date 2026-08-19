#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const CERT='loterias-ai/data/archive/_meta/bonoloto-official-payouts-recent-v1.json';
const OUT='loterias-ai/data/backtests/bonoloto-financial-tournament-official-v3.json';
if(!fs.existsSync(CERT))throw new Error('SELAE payout certification not yet available');
const cert=JSON.parse(fs.readFileSync(CERT,'utf8'));
if(cert.version!=='bonoloto-official-payouts-recent-v1'||cert.sourcePolicy!=='SELAE_ONLY'||cert.summary?.complete!==true||Number(cert.summary?.certified)!==Number(cert.summary?.targetDates)||Number(cert.summary?.failed)!==0)throw new Error('SELAE payout certification incomplete');

const ctx={globalThis:{},window:undefined,console,Math,Number,String,Array,Set,Object,Map,Date,JSON};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('loterias-ai/js/mega-numeric-engine.js','utf8'),ctx);
const M=ctx.globalThis.LotteryMegaNumericEngine;
if(!M?.portfolio)throw new Error('mega numeric engine unavailable');

const dir='loterias-ai/data/archive/bonoloto';let archive=[];
for(const f of fs.readdirSync(dir).filter(f=>/^\d{4}\.json$/.test(f)))archive.push(...(JSON.parse(fs.readFileSync(`${dir}/${f}`,'utf8')).records||[]));
archive=[...new Map(archive.map(r=>[r.drawDate,r])).values()].filter(r=>Array.isArray(r.result?.main)&&r.result.main.length===6).sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
const byDate=new Map(archive.map(r=>[r.drawDate,r]));
const strategies={balanced:{longFrequency:.20,shortMomentum:.15,gap:.15,stability:.15,pairAffinity:.10,entropy:.10,meanReversion:.15},frequency:{longFrequency:.45,shortMomentum:.25,gap:.05,stability:.10,pairAffinity:.05,entropy:.05,meanReversion:.05},gap:{longFrequency:.10,shortMomentum:.05,gap:.45,stability:.10,pairAffinity:.05,entropy:.10,meanReversion:.15},stability:{longFrequency:.15,shortMomentum:.10,gap:.10,stability:.40,pairAffinity:.10,entropy:.05,meanReversion:.10},cooccurrence:{longFrequency:.15,shortMomentum:.10,gap:.10,stability:.10,pairAffinity:.35,entropy:.10,meanReversion:.10}};

const draws=cert.rows.map(c=>{
 const r=byDate.get(c.date);if(!r)throw new Error(`canonical draw missing ${c.date}`);
 if(r.verification?.officialCrossCheck?.provider!=='SELAE'||r.verification?.officialCrossCheck?.complete!==true||r.verification?.status!=='OFFICIAL_SELAE_VALIDATED')throw new Error(`canonical draw not SELAE validated ${c.date}`);
 const p=c.payouts;return {date:c.date,winning:r.result.main.map(Number),complementary:Number(r.result.complementary),reintegro:Number(r.result.reintegro),_prizes:{six:Number(p.six.prizeEUR),fiveC:Number(p.fiveC.prizeEUR),five:Number(p.five.prizeEUR),four:Number(p.four.prizeEUR),three:Number(p.three.prizeEUR)},resultSource:r.verification.officialCrossCheck.sourceUrl,payoutSource:c.url};
}).sort((a,b)=>a.date.localeCompare(b.date));
if(draws.length!==Number(cert.summary.targetDates))throw new Error('certified draw count drift');
const cut=Math.max(20,Math.floor(draws.length*.70)),discovery=draws.slice(0,cut),holdout=draws.slice(cut);
const priorCache=new Map();for(const d of draws)priorCache.set(d.date,archive.filter(r=>r.drawDate<d.date).map(r=>r.result.main.map(Number)));
const prizeFor=(hits,ticket,draw)=>{const p=draw._prizes;if(hits===6)return p.six||0;if(hits===5){const missing=draw.winning.find(n=>!ticket.includes(n));return missing===draw.complementary?(p.fiveC||0):(p.five||0)}if(hits===4)return p.four||0;if(hits===3)return p.three||0;return 0};
function evaluateAll(ds,strategy){const acc=Array.from({length:5},(_,i)=>({strategy,tickets:i+1,draws:ds.length,stake:0,return:0,profitable:0}));for(const d of ds){const p=M.portfolio(priorCache.get(d.date),{id:'bonoloto',main:{max:49,pick:6}},{tickets:5,weights:strategies[strategy],diversificationPenalty:.10});const prizes=p.tickets.map(t=>{const h=t.numbers.filter(n=>d.winning.includes(n)).length;return prizeFor(h,t.numbers,d)});for(let k=1;k<=5;k++){const rr=prizes.slice(0,k).reduce((a,b)=>a+b,0),s=k*.5,x=acc[k-1];x.stake+=s;x.return+=rr;if(rr>s)x.profitable++}}return acc.map(x=>({...x,pl:x.return-x.stake,roi:x.stake?(x.return-x.stake)/x.stake:null,profitableDrawRate:x.draws?x.profitable/x.draws:null}))}
let candidates=[];for(const s of Object.keys(strategies))candidates.push(...evaluateAll(discovery,s));candidates.sort((a,b)=>b.roi-a.roi||b.pl-a.pl||a.strategy.localeCompare(b.strategy)||a.tickets-b.tickets);const selected=candidates[0],locked=evaluateAll(holdout,selected.strategy)[selected.tickets-1];
function rng(seed){let x=seed>>>0;return()=>((x=(1664525*x+1013904223)>>>0)/4294967296)}function sample(r){const a=Array.from({length:49},(_,i)=>i+1),o=[];while(o.length<6)o.push(a.splice(Math.floor(r()*a.length),1)[0]);return o.sort((a,b)=>a-b)}function randomEval(seed){const r=rng(seed);let stake=0,ret=0;for(const d of holdout){let rr=0;for(let i=0;i<selected.tickets;i++){const t=sample(r),h=t.filter(n=>d.winning.includes(n)).length;rr+=prizeFor(h,t,d)}stake+=selected.tickets*.5;ret+=rr}return{seed,roi:stake?(ret-stake)/stake:null,return:ret}}
const baselines=Array.from({length:100},(_,i)=>randomEval(1000+i)),avg=baselines.reduce((s,x)=>s+x.roi,0)/baselines.length,max=Math.max(...baselines.map(x=>x.roi));
const historicalGatePass=locked.roi>0&&locked.roi>avg&&locked.roi>max;
const out={version:'bonoloto-financial-tournament-official-v3',generatedAt:new Date().toISOString(),gameId:'bonoloto',sourcePolicy:'SELAE_ONLY_RESULTS_AND_PAYOUTS',methodology:'same-five-strategy-70-30-discovery-locked-holdout-v3-after-canonical-repair',dataRepairContext:{canonicalConflictsRepairedBeforeRecompute:17,recomputedFromScratch:true,previousTournamentNotCarriedForward:true},sample:{draws:draws.length,firstDate:draws[0]?.date??null,lastDate:draws.at(-1)?.date??null,discoveryDraws:discovery.length,holdoutDraws:holdout.length},discovery:{ranking:candidates},selected:{strategy:selected.strategy,tickets:selected.tickets,discoveryROI:selected.roi},holdout:locked,randomBaseline:{runs:100,averageROI:avg,maxROI:max},historicalGatePass,prospectivePromotionCandidate:false,truth:'Selection uses corrected official discovery data only; the locked strategy/ticket count is evaluated once on later corrected official holdout. Historical PASS alone cannot authorize money and would require a separately frozen prospective replication.',guards:{payoutCertificationComplete:true,canonicalResultsSELAEValidated:true,noThirdPartyEconomics:true,reintegroExcludedBecauseHistoricalTicketReintegroAssignmentUnknown:true,noFutureInformation:true,noOptionalStopping:true,noRealMoneyPromotionFromHistoricalOnly:true,automaticBettingAllowed:false,realMoneyAllowed:false,realStakeEUR:0}};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({sample:out.sample,selected:out.selected,holdout:out.holdout,baseline:out.randomBaseline,historicalGatePass},null,2));
