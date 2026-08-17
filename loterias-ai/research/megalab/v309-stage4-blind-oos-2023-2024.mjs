#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const R='loterias-ai';
const manifestPath=path.join(R,'data/research/metapleno-v309-dense-freeze-manifest.json');
const outPath=path.join(R,'data/research/metapleno-v309-stage4-oos-2023-2024.json');
const freeze=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
if(freeze.realMoneyPass!==false||freeze.realStakeEUR!==0||freeze.theoreticalBudgetEUR>15) throw new Error('fail-closed economic gate');
if(freeze.validationTouched!==false||freeze.postFreezeTouched!==false||freeze.retuningPerformed!==false) throw new Error('freeze contamination');
if(freeze.game!=='gordo-primitiva'||!Array.isArray(freeze.candidateParameters)||freeze.candidateParameters.length!==freeze.candidateCount) throw new Error('invalid freeze manifest');

const g={dir:'gordo-primitiva',max:54,pick:5};
const H=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
const rows=[];
for(const f of fs.readdirSync(path.join(R,'data/archive',g.dir)).filter(x=>/^\d{4}\.json$/.test(x)).sort()){
  const j=JSON.parse(fs.readFileSync(path.join(R,'data/archive',g.dir,f)));
  for(const z of j.records||j.draws||[]){
    const date=z.drawDate||z.date;
    const main=(z.result?.main||z.main||z.numbers||[]).map(Number).sort((a,b)=>a-b);
    if(date&&date>='2015-01-01'&&date<'2025-01-01'&&main.length===g.pick) rows.push({date,main,set:new Set(main)});
  }
}
const clean=[...new Map(rows.map(x=>[x.date,x])).values()].sort((a,b)=>a.date.localeCompare(b.date));
const lg=p=>Math.log(Math.max(1e-12,p));
function pred(i,s){
  const lo=Math.max(0,i-s.window),sc=[];
  for(let n=1;n<=g.max;n++){
    const bits=[]; for(let t=lo;t<i;t++) bits.push(clean[t].set.has(n)?1:0);
    const ones=bits.reduce((a,b)=>a+b,0),p=(ones+s.alpha)/(bits.length+2*s.alpha),bern=-(lg(p)-lg(1-p));
    let run=0; for(let k=bits.length-1;k>=0&&bits[k]===0;k--) run++;
    const runScore=Math.log1p(run)-Math.log1p(bits.length*(1-p));
    let c00=s.alpha,c01=s.alpha,c10=s.alpha,c11=s.alpha;
    for(let k=1;k<bits.length;k++){const a=bits[k-1],b=bits[k];if(!a&&!b)c00++;else if(!a&&b)c01++;else if(a&&!b)c10++;else c11++;}
    const last=bits.at(-1)||0,cp=last?c11/(c10+c11):c01/(c00+c01),context=lg(cp)-lg(1-cp);
    const rlo=Math.max(0,bits.length-s.recent),rone=bits.slice(rlo).reduce((a,b)=>a+b,0),rp=(rone+s.alpha)/(bits.length-rlo+2*s.alpha),delta=lg(rp)-lg(1-rp)-(lg(p)-lg(1-p));
    let v=s.mode==='bernoulli'?bern:s.mode==='run'?runScore:s.mode==='context1'?context:.25*(bern+runScore+context+delta);
    v+=((n*47+s.phase*23)%1019)*1e-10; sc.push({n,v});
  }
  sc.sort((a,b)=>b.v-a.v||a.n-b.n); return sc.slice(0,g.pick).map(x=>x.n).sort((a,b)=>a-b);
}
const ix=clean.map((r,i)=>[r,i]).filter(([r,i])=>r.date>='2023-01-01'&&r.date<'2025-01-01'&&i>=300).map(x=>x[1]);
const results=[]; let totalNearFull=0,totalFull=0,maxHits=0;
for(const s of freeze.candidateParameters){
  let hits=0,nearFull=0,fullMain=0; const trajectory=[]; const extreme=[];
  for(const i of ix){
    const p=pred(i,s),k=p.filter(n=>clean[i].set.has(n)).length; hits+=k; maxHits=Math.max(maxHits,k); if(k>=g.pick-1){nearFull++;totalNearFull++;extreme.push({date:clean[i].date,prediction:p,actual:clean[i].main,hits:k});} if(k===g.pick){fullMain++;totalFull++;}
    trajectory.push(`${clean[i].date}:${p.join('-')}:${k}`);
  }
  results.push({scientistId:s.scientistId,parameters:s,draws:ix.length,meanHits:hits/Math.max(1,ix.length),nearFull,fullMain,oosBehaviorHash:H(trajectory.join('|')),extreme});
}
const uniqueBehaviors=new Set(results.map(x=>x.oosBehaviorHash)).size;
const anomalyTriggered=totalNearFull>0||totalFull>0;
const out={version:'v309-stage4-oos-2023-2024',family:'MDL_COMPRESSION_SURPRISE',game:'gordo-primitiva',freezeManifest:'metapleno-v309-dense-freeze-manifest.json',freezeFingerprint:H(fs.readFileSync(manifestPath,'utf8')),window:{start:'2023-01-01',endExclusive:'2025-01-01'},candidateCount:freeze.candidateCount,uniqueOosBehaviors:uniqueBehaviors,draws:ix.length,maxHits,totalNearFull,totalFull,repeat5Plus:totalFull>0,anomalyTriggered,retuningPerformed:false,postFreezeTouched:false,realMoneyPass:false,realStakeEUR:0,theoreticalBudgetEUR:15,status:anomalyTriggered?'AUDIT_REQUIRED':'NEGATIVE_OOS_FALSIFIED',results};
fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({candidateCount:out.candidateCount,uniqueOosBehaviors:out.uniqueOosBehaviors,draws:out.draws,maxHits,totalNearFull,totalFull,status:out.status,realMoneyPass:false,realStakeEUR:0},null,2));
