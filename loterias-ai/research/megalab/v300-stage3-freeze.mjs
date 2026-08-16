#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
const IN='loterias-ai/data/research/metapleno-v300-stage1-2-selection.json';
const OUT='loterias-ai/data/research/metapleno-v300-stage3-freeze.json';
const x=JSON.parse(fs.readFileSync(IN,'utf8'));
if(x.validationTouched||x.postFreezeTouched||x.retuningPerformed||x.realMoneyPass||x.realStakeEUR!==0) throw new Error('stage1-2 isolation gate failed');
const frozen={};
for(const [game,g] of Object.entries(x.byGame||{})){
  const best=(g.best||[]).slice(0,8).map(r=>({scientistId:r.scientistId,game:r.game,hist:r.hist,bins:r.bins,lookback:r.lookback,mode:r.mode,channel:r.channel,behaviorHash:r.behaviorHash,selection:r.selection}));
  if(best.length!==8) throw new Error(`need 8 frozen candidates for ${game}`);
  frozen[game]=best;
}
const canonical=JSON.stringify(frozen);
const manifestHash=crypto.createHash('sha256').update(canonical).digest('hex');
const out={version:'v300-stage3',family:'COMPUTATIONAL_MECHANICS_CAUSAL_STATES',generatedAt:new Date().toISOString(),source:'metapleno-v300-stage1-2-selection.json',selectionWindow:x.selectionWindow,freezeRule:'top-8-per-game-from-pre-2023-behavioral-representatives',frozenCandidates:Object.values(frozen).flat().length,byGame:frozen,manifestHash,validationWindow:'2023-01-01/2025-01-01',validationTouched:false,postFreezeTouched:false,retuningPerformed:false,realMoneyPass:false,realStakeEUR:0,ordinaryBudgetMaxEUR:4,next:'blind-oos-2023-2024'};
fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({frozenCandidates:out.frozenCandidates,manifestHash,validationTouched:false,postFreezeTouched:false,realMoneyPass:false,realStakeEUR:0},null,2));
