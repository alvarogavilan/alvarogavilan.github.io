#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const R='loterias-ai';
const FREEZE=path.join(R,'data/research/metapleno-v311-stage3-freeze.json');
const OUT=path.join(R,'data/research/metapleno-v311-stage4-oos.json');
const freeze=JSON.parse(fs.readFileSync(FREEZE,'utf8'));
if(freeze.status!=='FROZEN_FOR_BLIND_OOS'||freeze.frozenCandidateCount!==32) throw new Error('invalid freeze');
if(freeze.realMoneyPass!==false||freeze.realStakeEUR!==0||freeze.theoreticalBudgetEURMax>15) throw new Error('economic gate violated');
if(freeze.validationTouched!==false||freeze.postFreezeTouched!==false||freeze.retuningPerformed!==false) throw new Error('freeze isolation violated');
const frozenSeal=freeze.freezeSealSHA256;
const {freezeSealSHA256,...rest}=freeze;
if(crypto.createHash('sha256').update(JSON.stringify(rest)).digest('hex')!==frozenSeal) throw new Error('freeze seal mismatch');

const defs={
  bonoloto:{dir:'bonoloto',max:49,pick:6},
  primitiva:{dir:'primitiva',max:49,pick:6},
  euromillones:{dir:'euromillones',max:50,pick:5},
  'gordo-primitiva':{dir:'gordo-primitiva',max:54,pick:5}
};
const H=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
function load(g){
  const rows=[];
  for(const f of fs.readdirSync(path.join(R,'data/archive',g.dir)).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
    const j=JSON.parse(fs.readFileSync(path.join(R,'data/archive',g.dir,f)));
    for(const z of j.records||j.draws||[]){
      const date=z.drawDate||z.date;
      const main=(z.result?.main||z.main||z.numbers||[]).map(Number).sort((a,b)=>a-b);
      if(date&&date<'2025-01-01'&&main.length===g.pick) rows.push({date,main,set:new Set(main)});
    }
  }
  return [...new Map(rows.map(x=>[x.date,x])).values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function scoreNumber(rows,i,n,cfg){
  let excitation=0,cross=0;
  const lo=Math.max(0,i-cfg.lookback);
  for(let t=lo;t<i;t++){
    const lag=i-t;
    if(rows[t].set.has(n)) excitation+=Math.exp(-cfg.beta*lag);
    if(cfg.cross>0){
      let overlap=0;
      for(const m of rows[i-1]?.main||[]) if(rows[t].set.has(m)) overlap++;
      if(rows[t].set.has(n)) cross+=cfg.cross*overlap*Math.exp(-cfg.beta*lag);
    }
  }
  let count=0; for(let t=lo;t<i;t++) if(rows[t].set.has(n)) count++;
  const baseline=(count+cfg.prior)/(Math.max(1,i-lo)+2*cfg.prior);
  return Math.log(Math.max(1e-12,baseline))+cfg.alpha*excitation+cross;
}
function predict(rows,i,g,cfg){
  const s=[];
  for(let n=1;n<=g.max;n++) s.push({n,v:scoreNumber(rows,i,n,cfg)+((n*37+cfg.phase*17)%997)*1e-12});
  s.sort((a,b)=>b.v-a.v||a.n-b.n);
  return s.slice(0,g.pick).map(x=>x.n).sort((a,b)=>a-b);
}
const games=[];
let anyNearFull=false, anyFull=false, anyFivePlus=false;
for(const fg of freeze.games){
  const g=defs[fg.game]; if(!g) throw new Error(`unknown game ${fg.game}`);
  const rows=load(g);
  const oosIdx=rows.map((r,i)=>[r,i]).filter(([r,i])=>r.date>='2023-01-01'&&r.date<'2025-01-01'&&i>=160).map(x=>x[1]);
  const candidates=[];
  for(const c of fg.selected){
    let hits=0,maxHits=0,nearFull=0,full=0,fivePlus=0; const events=[],trajectory=[];
    for(const i of oosIdx){
      const p=predict(rows,i,g,c.cfg);
      const k=p.filter(n=>rows[i].set.has(n)).length;
      hits+=k; maxHits=Math.max(maxHits,k);
      if(k>=g.pick-1){nearFull++; events.push({date:rows[i].date,prediction:p,actual:rows[i].main,hits:k});}
      if(k===g.pick) full++;
      if(k>=5) fivePlus++;
      trajectory.push(`${rows[i].date}:${p.join('-')}:${k}`);
    }
    candidates.push({candidateId:c.candidateId,cfg:c.cfg,draws:oosIdx.length,meanHits:hits/Math.max(1,oosIdx.length),maxHits,nearFull,full,fivePlus,oosBehaviorHash:H(trajectory.join('|')),events});
  }
  const uniqueBehaviorCount=new Set(candidates.map(x=>x.oosBehaviorHash)).size;
  const summary={game:fg.game,oosDraws:oosIdx.length,frozenCandidates:candidates.length,uniqueOosBehaviors:uniqueBehaviorCount,maxHits:Math.max(...candidates.map(x=>x.maxHits)),nearFullEvents:candidates.reduce((n,x)=>n+x.nearFull,0),fullEvents:candidates.reduce((n,x)=>n+x.full,0),fivePlusEvents:candidates.reduce((n,x)=>n+x.fivePlus,0),candidates};
  if(summary.nearFullEvents>0) anyNearFull=true;
  if(summary.fullEvents>0) anyFull=true;
  if(summary.fivePlusEvents>0) anyFivePlus=true;
  games.push(summary);
}
const auditRequired=anyNearFull||anyFull||anyFivePlus;
const out={
  version:'v311-stage4',family:'HAWKES_SELF_EXCITING_NUMBER_EVENTS',freezeSealSHA256:frozenSeal,
  blindOosStart:'2023-01-01',blindOosEndExclusive:'2025-01-01',postFreezeStart:'2025-01-01',
  validationTouched:true,postFreezeTouched:false,retuningPerformed:false,
  frozenCandidateCount:32,behavioralDeduplication:true,
  repeat5Plus:anyFivePlus,fullHit:anyFull,nearFull:anyNearFull,auditRequired,
  realMoneyPass:false,realStakeEUR:0,theoreticalBudgetEURMax:15,
  status:auditRequired?'OOS_SIGNAL_REQUIRES_HARD_AUDIT':'NEGATIVE_OOS_FALSIFIED',games
};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({status:out.status,auditRequired,repeat5Plus:anyFivePlus,fullHit:anyFull,games:games.map(g=>({game:g.game,oosDraws:g.oosDraws,uniqueOosBehaviors:g.uniqueOosBehaviors,maxHits:g.maxHits,nearFullEvents:g.nearFullEvents,fullEvents:g.fullEvents,fivePlusEvents:g.fivePlusEvents})),realMoneyPass:false,realStakeEUR:0},null,2));
