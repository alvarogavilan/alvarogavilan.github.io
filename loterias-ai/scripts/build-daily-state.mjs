import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const schedule=read('loterias-ai/data/draw-schedule.json');
const status=read('loterias-ai/data/system-status.json');
const bankroll=read('loterias-ai/data/treasury-ledger.json');
const probe=read('loterias-ai/data/source-probe-latest.json');
const now=new Date();
const madridParts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const part=t=>madridParts.find(x=>x.type===t)?.value;const date=`${part('year')}-${part('month')}-${part('day')}`;
function drawsOnDate(iso){const [y,m,d]=iso.split('-').map(Number),dow=new Date(Date.UTC(y,m-1,d,12)).getUTCDay(),out=[];for(const g of schedule.games||[]){if(g.mode==='FIXED_WEEKLY'&&Array.isArray(g.days)&&g.days.includes(dow))out.push({gameId:g.gameId,name:g.name,time:g.time,confidence:g.confidence});else if(g.mode==='FIXED_WEEKLY_MULTI_TIME'&&Array.isArray(g.slots))for(const s of g.slots)if(s.day===dow)out.push({gameId:g.gameId,name:g.name,time:s.time,confidence:g.confidence,note:g.note||null});else if(g.mode==='ANNUAL_SPECIAL'&&g.month===m&&g.dayOfMonth===d)out.push({gameId:g.gameId,name:g.name,time:g.time,confidence:g.confidence,note:g.note||null})}return out}
const drawsToday=drawsOnDate(date).filter(x=>!['navidad','nino'].includes(x.gameId)).map(x=>({...x,status:'SCHEDULED'}));
const allGatesPass=Array.isArray(status.gates)&&status.gates.every(g=>g.status==='PASS');
const demonstratedEdge=status.realMoneyRecommendationEnabled===true&&allGatesPass;
const balance=Number(bankroll.openingBankroll||50)+(Array.isArray(bankroll.entries)?bankroll.entries.reduce((s,e)=>s+Number(e.amount||0),0):0);
const daily={
  generatedAt:new Date().toISOString(),date,timeZone:'Europe/Madrid',
  scheduleVersion:schedule.version||null,scheduleSource:schedule.source||null,
  mode:demonstratedEdge?'EVIDENCE_QUALIFIED':'RESEARCH_ONLY',
  evidenceState:demonstratedEdge?'DEMONSTRATED_EDGE':'NO_DEMONSTRATED_EDGE',
  bankroll:{opening:Number(bankroll.openingBankroll||50),current:balance,recommendedRealStake:demonstratedEdge?null:0},
  drawsToday,
  sources:{reachable:probe.feeds?.filter(x=>x.ok).length||0,total:probe.feeds?.length||0},
  decision:demonstratedEdge?'RUN_QUALIFIED_COMMITTEE':'RESEARCH_AND_MEASURE',
  blockers:(status.gates||[]).filter(g=>g.status!=='PASS').map(g=>g.id||g.name),
  truthRule:'No real-money recommendation is emitted until all evidence gates pass; event-dependent schedules are never guessed.'
};
fs.mkdirSync('loterias-ai/data/daily',{recursive:true});
fs.writeFileSync('loterias-ai/data/daily/latest.json',JSON.stringify(daily,null,2)+'\n');
console.log(JSON.stringify({date,draws:drawsToday.length,mode:daily.mode,sources:daily.sources,balance,scheduleVersion:daily.scheduleVersion}));