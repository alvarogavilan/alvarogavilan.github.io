#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const SRC='loterias-ai/data/research/metapleno-v311-stage1-2.json';
const OUT='loterias-ai/data/research/metapleno-v311-stage3-freeze.json';
const source=JSON.parse(fs.readFileSync(SRC,'utf8'));
if(source.version!=='v311-stage1-2'||source.family!=='HAWKES_SELF_EXCITING_NUMBER_EVENTS') throw new Error('unexpected source');
if(source.validationTouched!==false||source.postFreezeTouched!==false||source.retuningPerformed!==false) throw new Error('source isolation violated');
if(source.realMoneyPass!==false||source.realStakeEUR!==0||source.theoreticalBudgetEURMax>15) throw new Error('economic gate violated');

const games=source.games.map(g=>{
  const selected=g.top.slice(0,8).map((r,rank)=>({
    candidateId:`v311-${g.game}-${String(rank+1).padStart(2,'0')}`,
    rank:rank+1,
    cfg:r.cfg,
    development:{draws:r.draws,meanHits:r.meanHits,maxHits:r.maxHits,nearFull:r.nearFull,full:r.full},
    developmentBehaviorHash:r.behaviorHash
  }));
  if(selected.length!==8) throw new Error(`expected 8 candidates for ${g.game}`);
  if(new Set(selected.map(x=>x.developmentBehaviorHash)).size!==selected.length) throw new Error(`behavior duplicate in ${g.game}`);
  return {game:g.game,selected};
});
if(games.length!==4||games.reduce((n,g)=>n+g.selected.length,0)!==32) throw new Error('freeze cardinality violated');
const payload={
  version:'v311-stage3',
  family:'HAWKES_SELF_EXCITING_NUMBER_EVENTS',
  protocol:'DENSE_DEVELOPMENT_FREEZE_BEFORE_BLIND_OOS',
  sourceEvidence:'metapleno-v311-stage1-2.json',
  sourceEvidenceSHA256:crypto.createHash('sha256').update(fs.readFileSync(SRC)).digest('hex'),
  developmentEndExclusive:'2023-01-01',
  blindOosStart:'2023-01-01',
  blindOosEndExclusive:'2025-01-01',
  postFreezeStart:'2025-01-01',
  validationTouched:false,
  postFreezeTouched:false,
  retuningPerformed:false,
  behavioralDeduplication:true,
  hardAuditOnRepeat5PlusOrFull:true,
  realMoneyPass:false,
  realStakeEUR:0,
  theoreticalBudgetEURMax:15,
  frozenCandidateCount:32,
  games,
  status:'FROZEN_FOR_BLIND_OOS'
};
const freezeSealSHA256=crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
const out={...payload,freezeSealSHA256};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({status:out.status,frozenCandidateCount:out.frozenCandidateCount,freezeSealSHA256,byGame:out.games.map(g=>({game:g.game,count:g.selected.length,developmentNearFull:g.selected.filter(x=>x.development.nearFull>0).length})),realMoneyPass:false,realStakeEUR:0,theoreticalBudgetEURMax:15},null,2));
