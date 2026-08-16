#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT='loterias-ai';
const DATA=path.join(ROOT,'data','research');
const OUT=path.join(DATA,'genius-audition-registry.json');
const hash=x=>crypto.createHash('sha256').update(String(x)).digest('hex');
const read=f=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return null}};
const files=fs.existsSync(DATA)?fs.readdirSync(DATA):[];

const stage4=files.filter(f=>/^metapleno-v\d+-stage4-strict-oos\.json$/.test(f)).sort();
const manifests=files.filter(f=>/^metapleno-v\d+-frozen-manifest\.json$/.test(f)).sort();
const selections=files.filter(f=>/^metapleno-v\d+-(stage1-2-selection|stage3-dense-freeze)\.json$/.test(f)).sort();
const manifestByVersion=new Map();
for(const f of manifests){const v=f.match(/metapleno-(v\d+)/)?.[1],x=read(path.join(DATA,f));if(v&&x)manifestByVersion.set(v,x)}

const familyRecords=[];
const candidates=[];
for(const f of stage4){
  const v=f.match(/metapleno-(v\d+)/)?.[1];
  const x=read(path.join(DATA,f));
  if(!v||!x)continue;
  const m=manifestByVersion.get(v);
  const near=Number(x.totalNearFullEvents??Object.values(x.byGame||{}).reduce((a,g)=>a+Number(g.nearFullEvents||0),0));
  const full=Number(x.totalFullMainEvents??Object.values(x.byGame||{}).reduce((a,g)=>a+Number(g.fullMainEvents||0),0));
  const frozen=Number(x.candidateCount??m?.candidateCount??0);
  const clean=x.retuningPerformed===false&&x.realMoneyPass===false&&x.read2025Plus!==true;
  const status=full>0&&clean?'OOS_FULL_REQUIRES_EXTREME_AUDIT':near>0&&clean?'OOS_SURVIVOR':'FALSIFIED_OOS';
  familyRecords.push({version:v,family:x.family||m?.family||'UNKNOWN',frozenCandidates:frozen,nearFullOOS:near,fullMainOOS:full,cleanProtocol:clean,status,evidenceFile:f});
  if((near>0||full>0)&&clean){
    for(const [game,g] of Object.entries(x.byGame||{})){
      for(const r of g.results||[]){const rn=Number(r.oos?.nearFull||0),rf=Number(r.oos?.fullMain||0);if(rn||rf)candidates.push({id:r.scientistId||hash(JSON.stringify(r)).slice(0,12),version:v,family:x.family||m?.family,game,nearFullOOS:rn,fullMainOOS:rf,tier:'OOS_SURVIVOR',requiresIndependentReplication:true})}
    }
  }
}

const selectionSignals=[];
for(const f of selections){
  const v=f.match(/metapleno-(v\d+)/)?.[1],x=read(path.join(DATA,f));if(!v||!x)continue;
  const byGame=x.byGame||{};
  for(const [game,g] of Object.entries(byGame)){
    const near=Number(g.nearFullBehaviors??g.nearFullEvents??g.near??0),full=Number(g.fullMainBehaviors??g.fullMainEvents??g.full??0);
    if(near||full)selectionSignals.push({version:v,family:x.family||'UNKNOWN',game,nearSelection:near,fullSelection:full,tier:'EINSTEIN_CANDIDATE',note:'Provisional only; selection evidence cannot establish predictive discovery.'})
  }
}

const rejected=familyRecords.filter(x=>x.status==='FALSIFIED_OOS').length;
const oosSurvivors=familyRecords.filter(x=>x.status!=='FALSIFIED_OOS').length;
const registry={
  version:'1.0.0',
  generatedAt:new Date().toISOString(),
  policy:'EVIDENCE_NOT_SELF_CONFIDENCE',
  counts:{oosFamiliesAudited:familyRecords.length,rejectedFamilies:rejected,oosSurvivingFamilies:oosSurvivors,oosCandidateEvents:candidates.length,selectionOnlySignals:selectionSignals.length,discoveryCandidates:0},
  topTier:oosSurvivors?'OOS_SURVIVOR':selectionSignals.length?'EINSTEIN_CANDIDATE':'ORIGINALITY_SURVIVOR',
  candidates,
  selectionSignals,
  familyRecords,
  gates:{retuningAfterFreeze:false,independentReplicationRequired:true,futureUntouchedDataRequired:true,multipleTestingCorrectionRequired:true,realMoneyPass:false,realStakeEUR:0},
  warning:'A high tier is a workflow state, not proof of an infallible method. No empirical lottery result can be labelled infallible by this engine.',
  registryHash:''
};
registry.registryHash=hash(JSON.stringify({...registry,registryHash:undefined}));
fs.writeFileSync(OUT,JSON.stringify(registry,null,2)+'\n');
console.log(JSON.stringify(registry.counts,null,2));
