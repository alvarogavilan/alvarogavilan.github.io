import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const load=(p,name)=>{const code=fs.readFileSync(p,'utf8');const ctx={globalThis:{},window:undefined,console,Date,Math,JSON,Number,String,Array,Set,Object,Error};vm.createContext(ctx);vm.runInContext(code,ctx);return ctx.globalThis[name];};
const schedule=load('loterias-ai/js/draw-schedule.js','LotteryDrawSchedule');
const status=read('loterias-ai/data/system-status.json');
const bankroll=read('loterias-ai/data/treasury-ledger.json');
const probe=read('loterias-ai/data/source-probe-latest.json');
const now=new Date();
const madrid=new Date(now.toLocaleString('en-US',{timeZone:'Europe/Madrid'}));
const date=madrid.toISOString().slice(0,10);
const drawsToday=schedule.drawsOnDate(date).map(x=>({gameId:x.gameId,name:x.name,time:x.time,status:'SCHEDULED'}));
const allGatesPass=Array.isArray(status.gates)&&status.gates.every(g=>g.status==='PASS');
const demonstratedEdge=status.realMoneyRecommendationEnabled===true&&allGatesPass;
const balance=Number(bankroll.openingBankroll||50)+(Array.isArray(bankroll.entries)?bankroll.entries.reduce((s,e)=>s+Number(e.amount||0),0):0);
const daily={
  generatedAt:new Date().toISOString(),date,timeZone:'Europe/Madrid',
  mode:demonstratedEdge?'EVIDENCE_QUALIFIED':'RESEARCH_ONLY',
  evidenceState:demonstratedEdge?'DEMONSTRATED_EDGE':'NO_DEMONSTRATED_EDGE',
  bankroll:{opening:Number(bankroll.openingBankroll||50),current:balance,recommendedRealStake:demonstratedEdge?null:0},
  drawsToday,
  sources:{reachable:probe.feeds?.filter(x=>x.ok).length||0,total:probe.feeds?.length||0},
  decision:demonstratedEdge?'RUN_QUALIFIED_COMMITTEE':'RESEARCH_AND_MEASURE',
  blockers:(status.gates||[]).filter(g=>g.status!=='PASS').map(g=>g.id||g.name),
  truthRule:'No real-money recommendation is emitted until all evidence gates pass.'
};
fs.mkdirSync('loterias-ai/data/daily',{recursive:true});
fs.writeFileSync('loterias-ai/data/daily/latest.json',JSON.stringify(daily,null,2)+'\n');
console.log(JSON.stringify({date,draws:drawsToday.length,mode:daily.mode,sources:daily.sources,balance}));