#!/usr/bin/env node
import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const must=(c,m)=>{if(!c)throw new Error(m)};
const root='loterias-ai/casino/standard-roulette';
const freeze=read(`${root}/evidence/independent-streams-v1-freeze.json`);
must(freeze.version==='standard-roulette-independent-streams-v1-freeze','standard freeze drift');
must(freeze.roulette?.baseGrossReturnX===36,'standard gross payout drift');
must(Math.abs(Number(freeze.roulette?.baseEconomicBreakEvenHitRate)-1/36)<1e-12,'standard break-even drift');
must(freeze.guards?.realMoneyAllowed===false,'standard real-money drift');
for(const stream of freeze.streams){
  const sp=`${root}/evidence/${stream.id}-segment-v1-status.json`;
  const pp=`${root}/evidence/${stream.id}-prospective-family-v1-status.json`;
  if(!fs.existsSync(sp))continue;
  const s=read(sp);
  must(s.freezeVersion===freeze.version,`${stream.id} segment freeze drift`);
  must(s.guards?.strictlyPostBarrier===true&&s.guards?.preBarrierRowsImported===false,`${stream.id} barrier drift`);
  must(s.continuity?.bridgeSafe===true,`${stream.id} continuity drift`);
  must(s.crossStream?.independentByRoundId===true&&s.crossStream?.mergeForbidden===true,`${stream.id} independence drift`);
  must(s.economics?.baseGrossReturnX===36&&Math.abs(Number(s.economics?.baseEconomicBreakEvenHitRate)-1/36)<1e-12,`${stream.id} economics drift`);
  must(s.guards?.realMoneyAllowed===false,`${stream.id} real-money drift`);
  if(fs.existsSync(pp)){
    const p=read(pp);
    must(p.freezeVersion===freeze.version,`${stream.id} prospective freeze drift`);
    must(p.economics?.baseGrossReturnX===36&&Math.abs(Number(p.economics?.baseEconomicBreakEvenHitRate)-1/36)<1e-12,`${stream.id} prospective economics drift`);
    must(p.guards?.first5000Only===true&&p.guards?.noRetuning===true&&p.guards?.noOptionalStopping===true,`${stream.id} stopping drift`);
    must(p.guards?.preBarrierPredictiveStateUsed===false,`${stream.id} pre-barrier state leak`);
    must(p.guards?.realMoneyAllowed===false,`${stream.id} prospective real-money drift`);
    if(Number(p.progress?.roundsScored)<5000){
      must(p.final===null,`${stream.id} early final`);
      must(p.disclosure?.candidatePerformanceHidden===true&&p.disclosure?.candidateRankingHidden===true&&p.disclosure?.pValuesHidden===true&&p.disclosure?.roiHidden===true,`${stream.id} interim disclosure`);
    }
  }
}
console.log('STANDARD_ROULETTE_CYCLE_SAFETY_OK');
