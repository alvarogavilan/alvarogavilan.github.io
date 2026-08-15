import fs from 'node:fs';
const TARGET='2026-08-16';
const cases=[
  {id:'v175',path:'loterias-ai/data/prospective/bonoloto-v175-v172-compressed-2eur-2026-08-16.json',fingerprint:'40bc4af86b8e2f98769edda0910536f95208c5f10ff2b2d6dbe81ca20c945bd0',ticketsKey:['prediction','tickets']},
  {id:'v178',path:'loterias-ai/data/prospective/bonoloto-v178-diversified-2eur-2026-08-16.json',fingerprint:'6c8d952af9decbc35a12029f116e76639a01a661d5ebc1816c9ee6e75206d492',ticketsKey:['portfolio']}
];
let rows=[];for(const f of fs.readdirSync('loterias-ai/data/archive/bonoloto').filter(x=>/^\d{4}\.json$/.test(x)).sort()){const j=JSON.parse(fs.readFileSync(`loterias-ai/data/archive/bonoloto/${f}`,'utf8'));rows.push(...(j.records||[]));}
rows=[...new Map(rows.map(r=>[r.drawId,r])).values()].filter(r=>r.result?.main?.length===6).sort((a,b)=>a.drawDate.localeCompare(b.drawDate));
const draw=rows.find(r=>r.drawDate===TARGET);if(!draw)throw new Error(`WAITING_OFFICIAL_TARGET:${TARGET}`);
const winning=draw.result.main.map(Number).sort((a,b)=>a-b);
const get=(o,path)=>path.reduce((x,k)=>x?.[k],o);
const settled=[];
for(const c of cases){const j=JSON.parse(fs.readFileSync(c.path,'utf8'));const fp=c.id==='v175'?j.prediction?.fingerprintSha256:j.fingerprintSha256;if(fp!==c.fingerprint)throw new Error(`${c.id}_FINGERPRINT_MISMATCH:${fp}`);if(j.dataBoundary?.targetResultObserved!==false)throw new Error(`${c.id}_TARGET_OBSERVED_FLAG_INVALID`);const tickets=get(j,c.ticketsKey);if(!Array.isArray(tickets)||tickets.length!==4)throw new Error(`${c.id}_TICKETS_INVALID`);const results=tickets.map((t,i)=>{const nums=t.map(Number).sort((a,b)=>a-b),hitNums=nums.filter(n=>winning.includes(n));return{index:i+1,ticket:nums,hits:hitNums.length,hitNumbers:hitNums};}).sort((a,b)=>b.hits-a.hits||a.index-b.index);settled.push({id:c.id,theoreticalStakeEUR:2,bestHits:results[0].hits,bestTicket:results[0],full6:results.some(x=>x.hits===6),fivePlus:results.some(x=>x.hits>=5),allTickets:results});}
const out={generatedAt:new Date().toISOString(),version:'v179',gameId:'bonoloto',targetDrawDate:TARGET,officialWinning:winning,settled,comparison:{winner:[...settled].sort((a,b)=>b.bestHits-a.bestHits)[0].id,bestHits:Math.max(...settled.map(x=>x.bestHits)),anyFull6:settled.some(x=>x.full6),anyFivePlus:settled.some(x=>x.fivePlus)},rules:{noRecalculation:true,sourceFreezesImmutable:true,alternativesNotAdditive:true},realMoneyPass:false,realStakeEUR:0};
fs.writeFileSync('loterias-ai/data/research/meta-pleno-v179-aug16-prospective-settlement.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out.comparison));